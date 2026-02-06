// pages/index/index.ts
import { api } from '../../services/api';
import { silentLogin, ensureLogin } from '../../utils/auth';
import { RoomParticipation } from '../../services/api';
Page({
  data: {
    statusBarHeight: 20,
    joinRoomNumber: '',
    createRoomName: '',
    currentRoom: {} as RoomParticipation,
  },
  onLoad() {
    const windowInfo = (wx as any).getWindowInfo();
    this.setData({ statusBarHeight: windowInfo.statusBarHeight });
    silentLogin();

  },
  formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  async loadCurrentRoom() {
    try {
      const user = await ensureLogin();
      const res = await api.getRoomByUser(user.id);
      const room = {
        ...res.data,
        createdAt: this.formatDate(res.data.createdAt || ''),
      };
      this.setData({ currentRoom: room });
    } catch {
      this.setData({ currentRoom: {} as RoomParticipation });
    }
  },
  onShow() {
    this.loadCurrentRoom();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0 // “大厅”对应的索引
      })
    }
  },
  onJoinInput(e: any) {
    this.setData({ joinRoomNumber: e.detail.value });
  },
  onCreateInput(e: any) {
    this.setData({ createRoomName: e.detail.value });
  },
  goToRoom() {
    const { currentRoom } = this.data;
    if (!currentRoom) return;
    wx.navigateTo({ url: `/pages/room/room?roomNumber=${currentRoom.room.roomNumber}` });
  },
  async onJoinRoom() {
    const { joinRoomNumber } = this.data;
    if (!joinRoomNumber) return;
    wx.showLoading({ title: '加入中' });
    try {
      const user = await ensureLogin();
      await api.joinRoom({
        roomNumber: joinRoomNumber,
        userId: user.id,
        roomNickname: user.nickname,
        roomAvatar: user.avatarUrl
      });
      wx.hideLoading();
      wx.navigateTo({ url: `/pages/room/room?roomNumber=${joinRoomNumber}` });
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '加入失败', icon: 'error' });
    }
  },
  // 创建并加入房间的辅助函数
  async createAndJoinRoom(user: any, roomName: string) {
    try {
      const res = await api.createRoom(
        user.id,
        roomName || '未命名对局'
      );
      const room = res.data;
      await api.joinRoom({
        roomNumber: room.roomNumber,
        userId: user.id,
        roomNickname: user.nickname,
        roomAvatar: user.avatarUrl
      });
      wx.hideLoading();
      wx.navigateTo({ url: `/pages/room/room?roomNumber=${room.roomNumber}` });
    } catch {
      wx.hideLoading();
    }
  },
  async onCreateRoom() {
    const { createRoomName } = this.data;
    wx.showLoading({ title: '创建中' });
    try {
      const user = await ensureLogin();

      if (user.avatarUrl == "") {
        // 提示用户，您还没有设置头像和名称，是否前往设置？是：跳转设置页面 否：直接创建房间
        wx.showModal({
          title: '提示',
          content: '您还没有设置头像和名称，是否前往设置？',
          showCancel: true,
          cancelText: '直接创建',
          confirmText: '去设置',
          success: async (res) => {
            if (res.confirm) {
              wx.hideLoading();
              wx.navigateTo({ url: '/pages/profile/profile' });
            } else if (res.cancel) {
              // 直接创建房间
              wx.hideLoading();
              await this.createAndJoinRoom(user, createRoomName);
            }
          }
        });
      } else {
        wx.hideLoading();
        // 有头像，直接创建房间
        await this.createAndJoinRoom(user, createRoomName);
      }
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'error' });
    }
  },
  switchTab(e: any) {
    const currentTab = e.currentTarget.dataset.tab;
    this.setData({ currentTab });
  }
});