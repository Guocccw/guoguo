// pages/index/index.ts
import { api } from '../../services/api';
import { silentLogin, ensureLogin } from '../../utils/auth';
Page({
  data: {
    statusBarHeight: 20,
    currentTab: 'lobby',
    joinRoomNumber: '',
    createRoomName: '',
    recentRooms: []
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight });
    silentLogin();
  },


  onJoinInput(e: any) {
    this.setData({ joinRoomNumber: e.detail.value });
  },

  onCreateInput(e: any) {
    this.setData({ createRoomName: e.detail.value });
  },

  async onJoinRoom() {
    const { joinRoomNumber } = this.data;
    if (!joinRoomNumber) return;

    wx.showLoading({ title: '加入中' });
    try {
      const user = await ensureLogin();

      const room = await api.joinRoom({
        roomNumber: joinRoomNumber,
        userId: user.id,
        roomNickname: user.nickname,
        roomAvatar: user.avatarUrl
      });

      wx.hideLoading();
      wx.navigateTo({ url: `/pages/room/room?roomId=${room.roomId}` });
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '加入失败', icon: 'error' });
    }
  },

  // 创建并加入房间的辅助函数
  async createAndJoinRoom(user: any, roomName: string) {
    try {
      const room = await api.createRoom(
        user.id,
        roomName || '未命名对局'
      );

      await api.joinRoom({
        roomNumber: room.roomNumber,
        userId: user.id,
        roomNickname: user.nickname,
        roomAvatar: user.avatarUrl
      });

      wx.hideLoading();
      wx.navigateTo({ url: `/pages/room/room?roomId=${room.id}` });
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'error' });
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
  }
});