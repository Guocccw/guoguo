import { api } from '../../services/api';

interface SettlementTransfer {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
}

Page({
  data: {
    statusBarHeight: 0,
    roomNumber: '',
    roomInfo: {},
    currentBalance: '',
    elapsedTime: '00:00:00',
    roomDate: '',
    creatorName: '',
    members: [] as any[],
    transfers: [] as any[],
    settlementTransfers: [] as SettlementTransfer[]
  },

  async onLoad(options) {
    const { roomId } = options;

    if (!roomId) {
      wx.showToast({ title: '房间ID不能为空', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const statusBarHeight = wx.getSystemInfoSync().statusBarHeight;
    this.setData({ statusBarHeight });

    await this.loadSettlementDetails(roomId);
  },

  async loadSettlementDetails(roomId: string) {
    try {
      wx.showLoading({ title: '加载中...' });

      const data = await api.getSettlementDetails(roomId);
      const { room, roomDetails, members, transfers } = data;

      const memberMap = new Map(members.map(m => [m.userId, m]));
      if (!room.creatorId) {
        wx.showToast({ title: '房间不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }
      const creator = memberMap.get(room.creatorId);

      const formattedTransfers = transfers.map(t => {
        const sender = memberMap.get(t.senderId);
        const receiver = memberMap.get(t.receiverId);
        return {
          id: t.id,
          time: this.formatTime(t.createdAt),
          senderName: sender?.roomNickname || '未知用户',
          receiverName: receiver?.roomNickname || '未知用户',
          amount: t.amount
        };
      });
      const formattedMembers = members.map(m => ({
        userId: m.userId,
        roomAvatar: m.roomAvatar,
        roomNickname: m.roomNickname,
        score: m.score
      }));
      const settlementTransfers = this.calculateSettlementTransfers(formattedMembers);

      this.setData({
        roomNumber: room.roomNumber,
        roomInfo: { name: room.name },
        roomDate: this.formatDate(room.createdAt),
        creatorName: creator?.roomNickname || '未知用户',
        elapsedTime: this.calcElapsedTime(roomDetails.totalDuration || ''),
        members: formattedMembers,
        currentBalance: roomDetails.creatorScore + "",
        transfers: formattedTransfers,
        settlementTransfers
      });

    } catch (error) {
      console.error('加载结算详情失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
  calcElapsedTime(durationStr: string): string {
    if (!durationStr) return '00:00:00';
    const durationMs = parseInt(durationStr, 10);
    const diffMs = durationMs;
    const diffSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  },

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  calculateSettlementTransfers(members: Array<{ userId: string; roomNickname: string; score: number }>): SettlementTransfer[] {
    const debtors = members
      .filter(member => member.score < 0)
      .map(member => ({
        userId: member.userId,
        name: member.roomNickname || '未知用户',
        amount: Math.abs(member.score)
      }))
      .sort((a, b) => a.amount - b.amount);

    const creditors = members
      .filter(member => member.score > 0)
      .map(member => ({
        userId: member.userId,
        name: member.roomNickname || '未知用户',
        amount: member.score
      }))
      .sort((a, b) => a.amount - b.amount);

    const result: SettlementTransfer[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0) {
        result.push({
          id: `${debtor.userId}-${creditor.userId}-${result.length}`,
          fromName: debtor.name,
          toName: creditor.name,
          amount
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount === 0) debtorIndex += 1;
      if (creditor.amount === 0) creditorIndex += 1;
    }

    return result;
  },

  goBack() {
    wx.navigateBack();
  },

  onMemberTap(e: any) {
    const member = e.currentTarget.dataset.member;
    console.log('点击成员:', member);
  }
});
