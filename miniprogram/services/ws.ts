class WebSocketManager {
  private socketTask: WechatMiniprogram.SocketTask | null = null;
  private url: string = '';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private messageQueue: any[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private currentUserId: string = '';
  private currentRoomId: string = '';
  private isReconnecting: boolean = false;

  /**
   * 连接 WebSocket
   * @param url WebSocket 服务器地址
   * @param userId 用户ID
   * @param roomId 房间ID
   * @param options 连接选项
   */
  connect(url: string, userId: string = '', roomId: string = '', options: {
    header?: Record<string, string>;
    protocols?: string[];
    tcpNoDelay?: boolean;
    perMessageDeflate?: boolean;
    timeout?: number;
    forceCellularNetwork?: boolean;
  } = {}) {
    this.url = url;
    this.currentUserId = userId;
    this.currentRoomId = roomId;
    
    // 关闭已存在的连接（仅在非重连状态下）
    if (this.socketTask && !this.isReconnecting) {
      this.close();
    }

    // 重置重连标志
    this.isReconnecting = false;

    this.socketTask = wx.connectSocket({
      url,
      header: options.header || {
        'content-type': 'application/json'
      },
      protocols: options.protocols,
      tcpNoDelay: options.tcpNoDelay,
      perMessageDeflate: options.perMessageDeflate,
      timeout: options.timeout,
    });
    console.log('WebSocket 连接已发起');

    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    if (!this.socketTask) return;

    this.socketTask.onOpen(() => {
      console.log('WebSocket 连接已打开');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.emit('open');
    });

    this.socketTask.onMessage((res) => {
      console.log('收到 WebSocket 消息:', res);
      this.emit('message', res);
      this.handleMessage(res);
    });

    this.socketTask.onClose((res) => {
      console.log('WebSocket 连接已关闭:', res);
      this.isConnected = false;
      this.socketTask = null;
      this.emit('close', res);
      
      // 仅在非主动断开连接时尝试重连
      if (res.code !== 1000) {
        this.attemptReconnect();
      }
    });

    this.socketTask.onError((err) => {
      console.error('WebSocket 错误:', err);
      this.emit('error', err);
    });
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(res: any) {
    try {
      let message;
      if (typeof res.data === 'string') {
        message = JSON.parse(res.data);
      } else {
        message = res.data;
      }

      if (message.type) {
        this.emit(message.type, message.data);
      }
    } catch (e) {
      console.error('解析消息失败:', e);
    }
  }

  /**
   * 发送消息
   * @param data 要发送的数据
   */
  send(data: any) {
    if (this.isConnected && this.socketTask) {
      const messageData = typeof data === 'string' ? data : JSON.stringify(data);
      this.socketTask.send({
        data: messageData,
        success: () => {
          console.log('消息发送成功');
          this.emit('sendSuccess');
        },
        fail: (err) => {
          console.error('消息发送失败:', err);
          this.emit('sendError', err);
        }
      });
    } else {
      // 连接未建立，加入消息队列
      this.messageQueue.push(data);
      console.log('连接未建立，消息已加入队列');
    }
  }

  /**
   * 关闭 WebSocket 连接
   * @param code 关闭代码
   * @param reason 关闭原因
   */
  close(code?: number, reason?: string) {
    if (this.socketTask) {
      try {
        this.socketTask.close({
          code,
          reason
        });
      } catch (e) {
        console.error('关闭 WebSocket 时出错:', e);
      }
      this.socketTask = null;
      this.isConnected = false;
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，延迟 ${delay}ms`);
      
      setTimeout(() => {
        console.log('执行重连');
        this.isReconnecting = true;
        this.connect(this.url);
      }, delay);
    } else {
      console.error('重连失败，已达到最大尝试次数');
      this.emit('reconnectFailed');
    }
  }

  /**
   * 刷新消息队列
   */
  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * 注册事件监听器
   * @param event 事件名称
   * @param listener 事件监听器
   */
  on(event: string, listener: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(listener);
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param listener 事件监听器
   */
  off(event: string, listener: Function) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param data 事件数据
   */
  private emit(event: string, data?: any) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.forEach(listener => {
          listener(data);
        });
      }
    }
  }

  /**
   * 获取连接状态
   * @returns 是否已连接
   */
  getConnectedState(): boolean {
    return this.isConnected;
  }

  /**
   * 加入房间
   * @param roomId 房间ID
   * @param userId 用户ID
   */
  joinRoom(roomId: string, userId: string) {
    this.send({
      type: 'joinRoom',
      data: { roomId, userId }
    });
  }

  /**
   * 离开房间
   * @param roomId 房间ID
   * @param userId 用户ID
   */
  leaveRoom(roomId: string, userId: string) {
    this.send({
      type: 'leaveRoom',
      data: { roomId, userId }
    });
  }

  /**
   * 更新用户输入状态
   * @param roomId 房间ID
   * @param isTyping 是否正在输入
   */
  updateTypingStatus(roomId: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      data: { roomId, userId: this.currentUserId, isTyping }
    });
  }

  /**
   * 发送转账请求
   * @param roomId 房间ID
   * @param receiverId 接收者ID
   * @param amount 金额
   */
  sendTransferRequest(roomId: string, receiverId: string, amount: number) {
    this.send({
      type: 'transferRequest',
      data: { roomId, senderId: this.currentUserId, receiverId, amount }
    });
  }

  /**
   * 响应转账请求
   * @param requestId 请求ID
   * @param accepted 是否接受
   */
  respondToTransferRequest(requestId: string, accepted: boolean) {
    this.send({
      type: 'transferRequestResponse',
      data: { requestId, accepted }
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.currentRoomId && this.currentUserId) {
      this.leaveRoom(this.currentRoomId, this.currentUserId);
    }
    // 停止重连
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.close(1000, 'User disconnected');
    this.currentUserId = '';
    this.currentRoomId = '';
  }
}

// 导出单例实例
const wsManager = new WebSocketManager();

export default wsManager;

// 导出类型
export type {
  WebSocketManager
};
