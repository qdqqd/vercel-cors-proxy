import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());

app.all('/*', async (req, res) => {
  try {
    const proxyParams = new URLSearchParams(req.url);
    const targetUrl = proxyParams.get('url');

    if (!targetUrl) {
      return res.status(400).json({
        title: "CORS代理错误-缺少必需参数",
        detail: "未提供参数：url",
      });
    }

    console.log("Proxying request to:", targetUrl);

    const response = await axios.get(targetUrl, { responseType: 'stream' });
    res.set(response.headers);
    response.data.pipe(res);

  } catch (err) {
    console.error("API 请求失败:", err.message);
    return res.status(500).json({
      title: "CORS代理错误-API 请求失败",
      detail: err.message,
    });
  }
});

export default app;
