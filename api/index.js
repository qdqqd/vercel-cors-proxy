import express from 'express';
import cors from 'cors';
import request from 'request';

// 解析代理请求参数
function parseProxyParameters(proxyRequest) {
  const params = {};
  // 从查询参数中获取目标 URL
  const urlMatch = proxyRequest.url.match(/(?<=[?&])url=(?<url>.*)$/);
  if (urlMatch) {
    params.url = decodeURIComponent(urlMatch.groups.url);
  }
  return params;
}

const app = express();
app.use(cors());
app.set('json spaces', 2);

// 处理所有请求
app.all('/*', (req, res) => {
  try {
    const proxyParams = parseProxyParameters(req);
    
    // 检查是否提供了目标 URL
    if (!proxyParams.url) {
      return res.status(400).json({
        title: "CORS代理错误-缺少必需参数",
        detail: "未提供参数：url",
      });
    }

    // 将请求代理到目标 URL
    req.pipe(request(proxyParams.url)).pipe(res);
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      title: "CORS代理错误-内部服务器错误",
      detail: err.message,
    });
  }
});

export default app;
