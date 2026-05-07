import { api } from '../../services/api';

Page({
  data: {
    statusBarHeight: 20,
    historyList: [] as any[],
    historyLoading: false
  },

  onLoad() {
    const windowInfo = (wx as any).getWindowInfo();
    this.setData({ statusBarHeight: windowInfo.statusBarHeight });
    this.loadHistory();
  },

  formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  async loadHistory() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo?.id || this.data.historyLoading) return;

    this.setData({ historyLoading: true });

    try {
      const participations = await api.getParticipations(userInfo.id);
      const historyList = [...(participations || [])]
        .sort((a, b) => {
          const aTime = new Date(a.room?.createdAt || a.createdAt).getTime();
          const bTime = new Date(b.room?.createdAt || b.createdAt).getTime();
          return bTime - aTime;
        })
        .map(item => ({
          ...item,
          roomName: (item as any).roomName || item.room?.name,
          roomNumber: (item as any).roomNumber || item.room?.roomNumber || '',
          createdAt: this.formatDate(item.room?.createdAt || item.createdAt)
        }));

      this.setData({ historyList });
    } catch (e) {
      console.error('获取全部对局历史失败', e);
      this.setData({ historyList: [] });
    } finally {
      this.setData({ historyLoading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  viewRoomDetail(e: any) {
    const roomId = e.currentTarget.dataset.item.roomId;
    wx.navigateTo({ url: `/pages/record/record?roomId=${roomId}` });
  }
});
