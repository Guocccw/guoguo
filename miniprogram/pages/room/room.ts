import { api, Room, RoomMember, Transfer } from '../../services/api';
import { ensureLogin, getCachedUser } from '../../utils/auth';
import wsManager from '../../services/ws';
Page({
  data: {
    // 基础数据
    statusBarHeight: 0,
    roomNumber: '',
    roomInfo: {} as Room,
    members: [] as RoomMember[],
    transfers: [] as Transfer[],

    // 新增数据字段
    currentBalance: 0,
    elapsedTime: '00:00:00',
    roomDate: '',
    creatorName: '',

    // 记分键盘相关
    showNumpad: false,
    selectedMember: {} as RoomMember,
    amount: '',

    // WebSocket相关
    wsConnected: false,
    typingUsers: [] as Array<{ userId: string, nickname: string }>,

    currentUserId: ''
  },

  // 定时器实例
  timer: null as any,

  onLoad(options: any) {
    ensureLogin().then(user => {
      this.setData({ currentUserId: user.id });
    });

    // 获取状态栏高度
    const windowInfo = (wx as any).getWindowInfo();
    this.setData({ statusBarHeight: windowInfo.statusBarHeight });

    // 获取房间号并加载数据
    if (options.roomNumber) {
      this.setData({ roomNumber: options.roomNumber });
      this.loadRoomData(options.roomNumber);
    }
  },

  // 加载房间相关数据
  async loadRoomData(roomNumber: string) {
    try {
      // 获取房间信息
      const roomInfo = await api.getRoomByNumber(roomNumber) || {};
      this.setData({ roomInfo });
      // 获取房间成员
      const members = await api.getMembers(roomInfo.id) || [];
      // 按分数排序（从高到低）
      const sortedMembers = members.sort((a, b) => b.score - a.score);
      console.log('排序后的成员:', sortedMembers);
      // 计算当前用户余额
      const currentMember = sortedMembers.find(m => m.userId === this.data.currentUserId);

      // 检查用户是否已加入房间，未加入则调用加入接口
      if (!currentMember) {
        const { roomNumber, currentUserId } = this.data;
        const roomNickname = `User${currentUserId.slice(-4)}`;
        const roomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`;

        try {
          await api.joinRoom({ roomNumber, userId: currentUserId, roomNickname, roomAvatar });
          // 重新加载房间数据以包含新成员
          await this.loadRoomData(roomNumber);
          return;
        } catch (joinError) {
          console.error('加入房间失败:', joinError);
          wx.showToast({ title: '加入房间失败', icon: 'none' });
        }
      }

      const currentBalance = currentMember ? currentMember.score : 0;

      // 计算房间已进行时间
      const elapsedTime = this.calculateElapsedTime(roomInfo.createdAt || '');

      // 格式化房间日期
      const roomDate = this.formatDate(roomInfo.createdAt || '');

      // 获取创建者名称
      const creatorMember = sortedMembers.find(m => m.userId === roomInfo.creatorId);
      const creatorName = creatorMember?.roomNickname || '未知';

      this.setData({
        members: sortedMembers,
        currentBalance,
        elapsedTime,
        roomDate,
        creatorName
      });

      // 获取转分记录
      const transfers = await api.getTransfersByRoom(roomInfo.id) || [];
      // 按时间排序（从新到旧）
      const sortedTransfers = transfers.sort((a, b) => {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      });
      // 格式化转分记录，添加时间和接收者名称
      const formattedTransfers = sortedTransfers.map(transfer => {
        const receiver = members.find(m => m.userId === transfer.receiverId);
        return {
          ...transfer,
          senderName: members.find(m => m.userId === transfer.senderId)?.roomNickname || '未知用户',
          time: this.formatTime(transfer.createdAt || ''),
          receiverName: receiver?.roomNickname || '未知用户'
        };
      });
      this.setData({
        transfers: formattedTransfers
      });

      // 连接WebSocket
      this.connectWebSocket(roomInfo.id);

      // 开始定时器
      this.startTimer();
    } catch (error) {
      console.error('加载房间数据失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 连接WebSocket
  connectWebSocket(roomId: string) {
    const { currentUserId } = this.data;
    if (!currentUserId) return;

    const wsUrl = "wss://guoguoscore.cloud/ws";
    wsManager.connect(wsUrl, currentUserId, roomId, {
      header: {
        'content-type': 'application/json'
      },
      protocols: ['json'],
      tcpNoDelay: true,
      perMessageDeflate: true,
      timeout: 5000,
      forceCellularNetwork: false
    });

    wsManager.on('open', () => {
      this.setData({ wsConnected: true });
      wsManager.joinRoom(roomId, currentUserId);
    });

    wsManager.on('error', () => {
      this.setData({ wsConnected: false });
    });

    wsManager.on('close', () => {
      this.setData({ wsConnected: false });
    });

    this.registerWebSocketListeners();
  },

  // 注册WebSocket事件监听器
  registerWebSocketListeners() {
    // 成员状态变更
    wsManager.on('memberStatusChanged', (data: any) => {
      console.log('Member status changed:', data);
      const { members } = this.data;
      const updatedMembers = members.map(member => {
        if (member.userId === data.userId) {
          return { ...member, isOnline: data.isOnline };
        }
        return member;
      });
      this.setData({ members: updatedMembers });
    });

    // 分数更新
    wsManager.on('scoreUpdated', (data: any) => {
      console.log('Score updated:', data);
      const { members } = this.data;
      const updatedMembers = members.map(member => {
        if (member.userId === data.memberId) {
          return { ...member, score: data.score };
        }
        return member;
      });
      // 重新排序
      const sortedMembers = updatedMembers.sort((a, b) => b.score - a.score);
      this.setData({ members: sortedMembers });

      // 更新当前用户余额
      const currentMember = sortedMembers.find(m => m.userId === this.data.currentUserId);
      if (currentMember) {
        this.setData({ currentBalance: currentMember.score });
      }
    });

    // 转账创建
    wsManager.on('transferCreated', (data: any) => {
      console.log('Transfer created:', data);
      const { transfers, members } = this.data;
      const receiver = members.find(m => m.userId === data.receiverId);
      const newTransfer = {
        ...data,
        time: this.formatTime(data.createdAt || ''),
        receiverName: receiver?.roomNickname || '未知用户'
      };
      const updatedTransfers = [newTransfer, ...transfers];
      this.setData({ transfers: updatedTransfers });
    });

    // 转账撤销
    wsManager.on('transferReverted', (data: any) => {
      console.log('Transfer reverted:', data);
      const { transfers } = this.data;
      const updatedTransfers = transfers.map(transfer => {
        if (transfer.id === data.transferId) {
          return { ...transfer, status: 'reverted' };
        }
        return transfer;
      });
      // 强制类型断言以匹配 Transfer 的 status 字段
      this.setData({ transfers: updatedTransfers as Transfer[] });
    });

    // 房间状态变更
    wsManager.on('roomStatusChanged', (data: any) => {
      console.log('Room status changed:', data);
      try {
        if (data.status == 'settled') {
          // 加载结算详情
          // this.loadSettlementDetails();
          console.log('房间已结算');
          wx.showToast({
            title: '结算成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              // 清除定时器
              this.clearTimer();
              // 断开WebSocket连接
              wsManager.disconnect();
              // 延迟返回，让用户看到成功提示
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        }
      } catch (error) {
        console.error('解析房间状态变更数据失败:', error);
      }
    });

    // 成员加入
    wsManager.on('memberJoined', (data: any) => {
      console.log('Member joined:', data);
      // 重新加载成员列表
      this.loadRoomMembers();
    });

    // 成员离开
    wsManager.on('memberLeft', (data: any) => {
      console.log('Member left:', data);
      // 重新加载成员列表
      this.loadRoomMembers();
    });

    // 用户输入状态
    wsManager.on('userTyping', (data: any) => {
      console.log('User typing:', data);
      const { typingUsers, members } = this.data;
      const member = members.find(m => m.userId === data.userId);
      if (!member) return;

      if (data.isTyping) {
        // 添加到正在输入列表
        if (!typingUsers.some(u => u.userId === data.userId)) {
          const updatedTypingUsers = [...typingUsers, { userId: data.userId, nickname: member.roomNickname }];
          this.setData({ typingUsers: updatedTypingUsers });
        }
      } else {
        // 从正在输入列表移除
        const updatedTypingUsers = typingUsers.filter(u => u.userId !== data.userId);
        this.setData({ typingUsers: updatedTypingUsers });
      }
    });

    // 消息接收
    wsManager.on('messageReceived', (data: any) => {
      console.log('Message received:', data);
      // 这里可以处理实时消息，例如显示聊天消息等
    });

    // 转账请求
    wsManager.on('transferRequestReceived', (data: any) => {
      console.log('Transfer request received:', data);
      // 显示转账请求弹窗
      this.showTransferRequest(data);
    });

    // 转账请求响应
    wsManager.on('transferRequestResponse', (data: any) => {
      console.log('Transfer request response:', data);
      if (data.accepted) {
        wx.showToast({ title: '转账请求已接受', icon: 'success' });
      } else {
        wx.showToast({ title: '转账请求已拒绝', icon: 'none' });
      }
    });

    // 转账完成
    wsManager.on('transferCompleted', (data: any) => {
      console.log('Transfer completed:', data);
      wx.showToast({ title: '转账成功', icon: 'success' });
    });

    // 转账失败
    wsManager.on('transferFailed', (data: any) => {
      console.log('Transfer failed:', data);
      wx.showToast({ title: '转账失败', icon: 'none' });
    });

    // 房间设置更新
    wsManager.on('roomSettingsUpdated', (data: any) => {
      console.log('Room settings updated:', data);
      // 这里可以处理房间设置更新，例如更新房间名称、公告等
    });

    // 成员信息更新
    wsManager.on('memberInfoUpdated', (data: any) => {
      console.log('Member info updated:', data);
      // 重新加载成员列表
      this.loadRoomMembers();
    });

    // 房间信息同步
    wsManager.on('roomInfoSynced', (data: any) => {
      console.log('Room info synced:', data);
      // 这里可以处理房间信息同步，例如更新成员列表、转账记录等
    });
  },

  // 加载房间成员
  async loadRoomMembers() {
    const { roomInfo } = this.data;
    if (!roomInfo.id) return;

    try {
      const members = await api.getMembers(roomInfo.id) || [];
      // 按分数排序（从高到低）
      const sortedMembers = members.sort((a, b) => b.score - a.score);
      this.setData({ members: sortedMembers });
    } catch (error) {
      console.error('加载房间成员失败:', error);
    }
  },

  // 显示转账请求弹窗
  showTransferRequest(data: any) {
    const { members } = this.data;
    const sender = members.find(m => m.userId === data.senderId);
    if (!sender) return;

    wx.showModal({
      title: '转账请求',
      content: `${sender.roomNickname} 向你请求转账 ${data.amount} 分`,
      success: (res) => {
        if (res.confirm) {
          // 接受转账请求
          wsManager.respondToTransferRequest(data.requestId, true);
        } else if (res.cancel) {
          // 拒绝转账请求
          wsManager.respondToTransferRequest(data.requestId, false);
        }
      }
    });
  },

  // 格式化时间
  formatTime(timeString: string): string {
    const date = new Date(timeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 计算已进行时间
  calculateElapsedTime(createdAt: string): string {
    if (!createdAt) return '00:00:00';

    const createdTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const elapsedSeconds = Math.floor((now - createdTime) / 1000);

    const hours = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  },

  // 格式化日期
  formatDate(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}.${month}.${day}`;
  },

  // 返回按钮点击事件
  goBack() {
    this.onExitRoom();
  },

  // 分享按钮或右上角菜单触发
  onShareAppMessage() {
    const { roomInfo } = this.data;
    const roomNumber = roomInfo.roomNumber || '';
    const user = getCachedUser();
    if (!user) {
      wx.showToast({ title: '用户信息不存在', icon: 'none' });
      return;
    }
    return {
      title: `快来加入我的房间 ${roomNumber}！`,
      path: `/pages/room/room?roomNumber=${roomNumber}`,
      imageUrl: "/images/share-cover.png", // 分享图（网络图或本地图）
    };
  },

  // 成员头像点击事件
  onMemberTap(event: any) {
    // 需要检查是否是当前用户
    const member = event.currentTarget.dataset.member;
    if (member.userId === this.data.currentUserId) {
      // wx.showToast({ title: '不能转分给自己', icon: 'none' });
      return;
    }
    this.setData({
      selectedMember: member,
      showNumpad: true,
      amount: ''
    });
    // 发送正在输入状态
    wsManager.updateTypingStatus(this.data.roomInfo.id, true);
  },

  // 数字键盘点击事件
  onNumTap(event: any) {
    const num = event.currentTarget.dataset.num;
    // 限制输入长度和小数位数
    if (this.data.amount.length >= 10) return;
    if (num === '.' && this.data.amount.includes('.')) return;
    if (num === '.' && this.data.amount === '') return;

    this.setData({
      amount: this.data.amount + num
    });
  },

  // 删除按钮点击事件
  onDeleteTap() {
    this.setData({
      amount: this.data.amount.slice(0, -1)
    });
  },

  // 确认转分
  async submitTransfer() {
    const { selectedMember, amount, roomInfo, currentUserId } = this.data;

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入有效分值', icon: 'none' });
      return;
    }

    try {
      // 关闭输入状态
      wsManager.updateTypingStatus(roomInfo.id, false);

      // 创建转分
      await api.createTransfer({
        roomId: roomInfo.id,
        senderId: currentUserId,
        receiverId: selectedMember.userId,
        amount: parseFloat(amount)
      });

      // 关闭键盘
      this.closeNumpad();

      wx.showToast({ title: '转分成功', icon: 'success' });
    } catch (error) {
      console.error('转分失败:', error);
      wx.showToast({ title: '转分失败', icon: 'none' });
    }
  },

  // 关闭记分键盘
  closeNumpad() {
    this.setData({ showNumpad: false });
    // 关闭输入状态
    wsManager.updateTypingStatus(this.data.roomInfo.id, false);
  },

  // 阻止事件冒泡
  stopBubble() {
    // 空函数，用于阻止事件冒泡
  },

  // 开始定时器
  startTimer() {
    // 清除现有定时器
    if (this.timer) {
      clearInterval(this.timer);
    }

    // 每秒更新一次已进行时间
    this.timer = setInterval(() => {
      const { roomInfo } = this.data;
      if (roomInfo.createdAt) {
        const elapsedTime = this.calculateElapsedTime(roomInfo.createdAt);
        this.setData({ elapsedTime });
      }
    }, 1000);
  },

  // 清除定时器
  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 发送转账请求
  sendTransferRequest() {
    const { selectedMember, amount, roomInfo } = this.data;
    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入有效分值', icon: 'none' });
      return;
    }

    // 发送转账请求
    wsManager.sendTransferRequest(
      roomInfo.id,
      selectedMember.userId,
      parseFloat(amount)
    );

    this.closeNumpad();
    wx.showToast({ title: '转账请求已发送', icon: 'success' });
  },
  async onDismissRoom() {
    wx.showToast({ title: '解散房间成功', icon: 'success' });
  },
  async onExitRoom() {
    try {
      // 退出房间
      await api.leaveRoom({
        roomId: this.data.roomInfo.id,
        userId: this.data.currentUserId
      });
      // 断开WebSocket连接
      wsManager.disconnect();
      wx.showToast({ title: '退出房间成功', icon: 'success' });
      // // 清除定时器
      this.clearTimer();
      // 断开WebSocket连接
      wsManager.disconnect();
      wx.switchTab({ url: '/pages/index/index' });
    } catch (error) {
      console.error('退出房间失败:', error);
      wx.showToast({ title: '退出房间失败', icon: 'none' });
    }
  },

  // 一键结算并退出
  async onSettleTap() {
    const { roomInfo, currentUserId } = this.data;

    try {
      // 结算房间
      await api.settleRoom({
        roomId: roomInfo.id,
        userId: currentUserId
      });

      // wx.showToast({
      //   title: '结算成功',
      //   icon: 'success',
      //   duration: 1500,
      //   success: () => {
      //     // 清除定时器
      //     this.clearTimer();
      //     // 断开WebSocket连接
      //     wsManager.disconnect();
      //     // 延迟返回，让用户看到成功提示
      //     setTimeout(() => {
      //       wx.navigateBack();
      //     }, 1500);
      //   }
      // });
    } catch (error) {
      console.error('结算失败:', error);
      wx.showToast({ title: '结算失败', icon: 'none' });
    }
  },

  // 页面卸载时清除定时器和断开WebSocket连接
  onUnload() {
    this.clearTimer();
    wsManager.disconnect();
  }
});

