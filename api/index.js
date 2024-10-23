import express from 'express';
import cors from 'cors';
import axios from 'axios';

function parseProxyParameters(proxyRequest) {
  const params = {};
  // 提取并解码 URL 参数
  const urlMatch = proxyRequest.url.match(/(?<=[?&])url=(?<url>.*)$/);
  if (urlMatch) {
    params.url = decodeURIComponent(urlMatch.groups.url);
  }
  return params;
}

const app = express();
app.use(cors());
app.set('json spaces', 2);

app.all('/*', async (req, res) => {
  try {
    const proxyParams = parseProxyParameters(req);
    if (!proxyParams.url) {
      return res.status(400).json({
        title: "CORS代理错误-缺少必需参数",
        detail: "未提供参数：url",
        tips: "可选域: https://cors.qdqqd.com/?url= , https://cors-qdqqd.vercel.app/?url=",
      });
    }

    // 打印解码后的 URL
    console.log("Proxying request to:", proxyParams.url);

    // 使用 axios 进行代理请求
    const response = await axios({
      method: req.method,
      url: proxyParams.url,
      headers: req.headers,  // 复制请求头
      responseType: 'stream',  // 保持流式响应
    });

    // 将目标响应的头部和数据传递给客户端
    res.set(response.headers);
    response.data.pipe(res);
    
  } catch (err) {
    console.error("API 请求失败:", err.message);

    // 处理不同的错误情况
    if (err.response) {
      // 目标服务器返回了非 2xx 的状态码
      return res.status(err.response.status).json({
        title: `CORS代理错误-API 返回错误(${err.response.status})`,
        detail: err.response.data || err.response.statusText,
      });
    } else if (err.request) {
      // 请求已发出，但没有收到回应
      return res.status(500).json({
        title: "CORS代理错误-没有收到目标服务器的响应",
        detail: "请求已发出，但没有收到响应。",
      });
    } else {
      // 设置请求时发生了错误
      return res.status(500).json({
        title: "CORS代理错误-请求配置错误",
        detail: err.message,
      });
    }
  }
});

export default app;
