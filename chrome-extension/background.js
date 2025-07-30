// Chrome 插件后台脚本
// 处理跨域请求和消息传递

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'makeRequest') {
    // 处理跨域 HTTP 请求
    makeHttpRequest(request.config)
      .then(response => {
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('Background request failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // 返回 true 表示异步响应
    return true;
  }
  
  if (request.action === 'setValue') {
    // 存储数据
    chrome.storage.local.set({ [request.key]: request.value }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getValue') {
    // 获取数据
    chrome.storage.local.get([request.key], (result) => {
      sendResponse({ success: true, value: result[request.key] });
    });
    return true;
  }
});

// 通用 HTTP 请求函数
async function makeHttpRequest(config) {
  const { url, method = 'GET', headers = {}, body, responseType = 'json' } = config;
  
  try {
    const fetchOptions = {
      method: method,
      headers: headers
    };
    
    if (body) {
      if (method === 'POST' && headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        fetchOptions.body = body;
      } else if (typeof body === 'object') {
        fetchOptions.body = JSON.stringify(body);
        fetchOptions.headers['Content-Type'] = 'application/json';
      } else {
        fetchOptions.body = body;
      }
    }
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    let responseData;
    if (responseType === 'json') {
      responseData = await response.json();
    } else if (responseType === 'text') {
      responseData = await response.text();
    } else {
      responseData = await response.blob();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
    
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('AugmentCode 自动注册助手已安装');
});
