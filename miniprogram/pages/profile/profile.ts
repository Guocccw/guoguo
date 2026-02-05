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
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Mosz',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Orange',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=yuma',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=fuck',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=huole',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=facai',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Melon'
    ]
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const userInfo = wx.getStorageSync('userInfo');
    
    this.setData({ 
      statusBarHeight: sysInfo.statusBarHeight,
      userInfo: userInfo,
      tempNickname: userInfo?.nickname || '',
      tempAvatarUrl: userInfo?.avatarUrl || ''
    });
  },

  onNicknameInput(e: any) {
    this.setData({ tempNickname: e.detail.value });
  },

  onClearNickname() {
    this.setData({ tempNickname: '' });
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        this.setData({ 
          tempAvatarUrl: path,
          selectedPreset: '' 
        });
      }
    });
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

      wx.setStorageSync('userInfo', res);
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