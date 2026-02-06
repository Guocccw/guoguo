import { api, Room, RoomMember, Transfer } from '../../services/api';
import { ensureLogin, getCachedUser } from '../../utils/auth';

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
    this.setData({ statusBarHeight: windowInfo.statusBarHeight + 40 });

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
      const res = await api.getRoomByNumber(roomNumber);
      const roomInfo = res.data || {};
      this.setData({ roomInfo });
      // 获取房间成员
      const resMembers = await api.getMembers(roomInfo.id);
      const members = resMembers.data || [];
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
      const resTransfers = await api.getTransfersByRoom(roomInfo.id);
      const transfers = resTransfers.data || [];
      // 按时间排序（从新到旧）
      const sortedTransfers = transfers.sort((a, b) => {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      });
      // 格式化转分记录，添加时间和接收者名称
      const formattedTransfers = sortedTransfers.map(transfer => {
        const receiver = members.find(m => m.userId === transfer.receiverId);
        return {
          ...transfer,
          time: this.formatTime(transfer.createdAt || ''),
          receiverName: receiver?.roomNickname || '未知用户'
        };
      });
      this.setData({
        transfers: formattedTransfers
      });

      // 开始定时器
      this.startTimer();
    } catch (error) {
      console.error('加载房间数据失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
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
    // 清除定时器
    this.clearTimer();
    wx.navigateBack();
  },

  // 邀请好友
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
      imageUrl: user.avatarUrl || '', // 分享图（网络图或本地图）
    };
  },

  // 点击“邀请好友”按钮也可以主动触发
  onInvite() {
    wx.showShareMenu({
      withShareTicket: true,  // 获取群信息（可选）
      menus: ['shareAppMessage']
    });
  },

  // 成员头像点击事件
  onMemberTap(event: any) {
    // 需要检查是否是当前用户
    const member = event.currentTarget.dataset.member;
    if (member.userId === this.data.currentUserId) {
      wx.showToast({ title: '不能转分给自己', icon: 'none' });
      return;
    }
    this.setData({
      selectedMember: member,
      showNumpad: true,
      amount: ''
    });
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
      // 创建转分
      await api.createTransfer({
        roomId: roomInfo.id,
        senderId: currentUserId,
        receiverId: selectedMember.userId,
        amount: parseFloat(amount)
      });

      // 重新加载数据
      this.loadRoomData(this.data.roomNumber);

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

  // 一键结算并退出
  async onSettleTap() {
    const { roomInfo, currentUserId } = this.data;

    try {
      // 结算房间
      await api.settleRoom({
        roomId: roomInfo.id,
        userId: currentUserId
      });

      wx.showToast({
        title: '结算成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          // 清除定时器
          this.clearTimer();
          // 延迟返回，让用户看到成功提示
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
    } catch (error) {
      console.error('结算失败:', error);
      wx.showToast({ title: '结算失败', icon: 'none' });
    }
  },

  // 页面卸载时清除定时器
  onUnload() {
    this.clearTimer();
  }
});
