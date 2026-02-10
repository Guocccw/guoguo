Page({
  data: {
    statusBarHeight: 0,
    roomNumber: '',
    roomInfo: {},
    currentBalance: 0,
    elapsedTime: '00:00:00',
    roomDate: '',
    creatorName: '',
    members: [],
    transfers: []
  },

  onLoad(options) {
    // 获取状态栏高度
    const statusBarHeight = wx.getSystemInfoSync().statusBarHeight;
    this.setData({ statusBarHeight });

    // 模拟数据
    this.setData({
      roomNumber: 'ROOM-12345',
      roomInfo: { name: '欢乐斗地主' },
      currentBalance: 1000,
      elapsedTime: '01:30:45',
      roomDate: '2024-07-01 14:30',
      creatorName: '张三',
      members: [
        { userId: '1', roomAvatar: '/images/avatar1.png', roomNickname: '张三', score: 1000 },
        { userId: '2', roomAvatar: '/images/avatar2.png', roomNickname: '李四', score: -500 },
        { userId: '3', roomAvatar: '/images/avatar3.png', roomNickname: '王五', score: -500 }
      ],
      transfers: [
        { id: '1', time: '14:30:00', senderName: '张三', receiverName: '李四', amount: 500 },
        { id: '2', time: '14:45:00', senderName: '李四', receiverName: '张三', amount: 1000 },
        { id: '3', time: '15:00:00', senderName: '王五', receiverName: '张三', amount: 500 }
      ]
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onMemberTap(e) {
    const member = e.currentTarget.dataset.member;
    console.log('点击成员:', member);
  }
});