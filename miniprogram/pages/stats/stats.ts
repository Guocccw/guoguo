import { api } from '../../services/api';
import { refreshCachedUser } from '../../utils/auth';
const RECENT_HISTORY_LIMIT = 5;

Page({
  data: {
    statusBarHeight: 20,
    userInfo: {} as any,
    stats: {} as any,
    absBalance: '0',
    historyList: [] as any[],
    historyLoading: false,
    hasMoreHistory: false
  },

  onLoad() {
    const windowInfo = (wx as any).getWindowInfo();
    console.log(windowInfo.statusBarHeight);
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight
    });
  },
  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
    // 重新获取用户信息，确保多端修改头像/昵称后页面展示一致
    const userInfo = await refreshCachedUser();
    this.setData({ userInfo: userInfo });
    this.loadStats();
    this.loadHistory();
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    const { userInfo } = this.data;
    if (!userInfo?.id) return;

    try {
      const stats = await api.getUserStats(userInfo.id);
      // 根据UserStats接口，使用totalProfit是一个计算的式子 例如 0-5, 1-2+2-3 等
      function calcExpression(expr: string): number {
        return expr
          .replace(/\s+/g, '')          // 去空格
          .match(/[+-]?\d+/g)!          // 拆成 [+1, -2, +3]
          .map(Number)
          .reduce((sum, n) => sum + n, 0)
      }
      const totalProfit = stats.totalProfit == '0' ? 0 : calcExpression(stats.totalProfit);
      this.setData({
        stats: stats,
        absBalance: totalProfit.toFixed(2)
      });
    } catch (e) {
      console.error('获取统计失败', e);
      // 出错时确保显示0
      this.setData({
        absBalance: '0'
      });
    }
  },
  /**
   * 格式化日期为yyyy-MM-dd格式
   */
  formatDate(dateString: string) {
    // 检查是否为空字符串
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  /**
   * 加载对局历史
   */
  async loadHistory() {
    const { userInfo } = this.data;
    if (!userInfo?.id || this.data.historyLoading) return;

    this.setData({ historyLoading: true });

    try {
      const participations = await api.getParticipations(
        userInfo.id,
        { limit: RECENT_HISTORY_LIMIT }
      );
      const sortedParticipations = [...(participations || [])].sort((a, b) => {
        const aTime = new Date(a.room?.createdAt || a.createdAt).getTime();
        const bTime = new Date(b.room?.createdAt || b.createdAt).getTime();
        return bTime - aTime;
      });
      const displayedParticipations = sortedParticipations.slice(0, RECENT_HISTORY_LIMIT);
      const historyList = displayedParticipations.map(item => ({
        ...item,
        roomName: (item as any).roomName || item.room?.name,
        roomNumber: (item as any).roomNumber || item.room?.roomNumber || '',
        createdAt: this.formatDate(item.room?.createdAt || item.createdAt)
      }));
      this.setData({
        historyList,
        hasMoreHistory: sortedParticipations.length >= RECENT_HISTORY_LIMIT
      });
    } catch (e) {
      console.error('获取对局历史失败', e);
      // 出错时确保显示空数组
      this.setData({ historyList: [], hasMoreHistory: false });
    } finally {
      this.setData({ historyLoading: false });
    }
  },

  loadAllHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'lobby') {
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  viewRoomDetail(e: any) {
    const roomId = e.currentTarget.dataset.item.roomId;
    // 这里可以跳转到结算详情页（如果后续开发的话）
    wx.navigateTo({ url: `/pages/record/record?roomId=${roomId}` });
  }
});
