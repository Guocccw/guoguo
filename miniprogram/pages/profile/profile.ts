import { api } from '../../services/api';

Page({
  data: {
    statusBarHeight: 20,
    userInfo: {} as any,
    tempNickname: '',
    tempAvatarUrl: '',
    selectedPreset: '',
    presetAvatars: [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=happy',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Melon',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Orange',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=yuma',
      "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Destiny",
      "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=George",
      "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Brooklynn",
      "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Brian",
      "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Jameson",
      "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Sadie",
      "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Brooklynn",
      "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Ryan"
    ]
  },

  onLoad() {
    this.initUserInfo();
  },

  onShow() {
    this.initUserInfo();
  },

  initUserInfo() {
    const windowInfo = (wx as any).getWindowInfo();
    const userInfo = wx.getStorageSync('userInfo');
    
    this.setData({ 
      statusBarHeight: windowInfo.statusBarHeight,
      userInfo: userInfo,
      tempNickname: userInfo?.nickname || '',
      tempAvatarUrl: userInfo?.avatarUrl || ''
    });
  },

  onNicknameInput(e: any) {
    this.setData({ tempNickname: e.detail.value });
  },

  onClearNickname() {
    console.log('确认清空昵称吗？');
    this.setData({ tempNickname: '' });
  },

  onSelectPreset(e: any) {
    const url = e.currentTarget.dataset.url;
    this.setData({ 
      tempAvatarUrl: url,
      selectedPreset: url 
    });
  },

  async onSaveProfile() {
    const { tempNickname, tempAvatarUrl, userInfo } = this.data;
    
    if (!tempNickname.trim()) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中' });

    try {
      // 使用更新用户信息接口
      const res = await api.updateUser(userInfo.id, {
        nickname: tempNickname,
        avatarUrl: tempAvatarUrl
      });

      wx.setStorageSync('userInfo', res.data);
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 300);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});