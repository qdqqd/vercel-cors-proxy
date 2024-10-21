import express from 'express';
import cors from 'cors';
import request from 'request';
import zlib from 'zlib';

function parseProxyParameters(proxyRequest) {
  const params = {};
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
        "title": "CORS代理错误-缺少必需参数",
        "detail": "未提供参数：url",
      });
    }
    
    const target = request(proxyParams.url);
    
    target.on('response', function(targetResponse) {
      const contentType = targetResponse.headers['content-type'] || 'text/html';
      res.setHeader('Content-Type', contentType);

      const buffers = []; // 用于存储响应数据的数组
      
      // 判断响应的内容编码
      const encoding = targetResponse.headers['content-encoding'];
      
      targetResponse.on('data', chunk => {
        buffers.push(chunk); // 收集 Buffer 数据
      });

      targetResponse.on('end', () => {
        const body = Buffer.concat(buffers); // 合并所有 Buffer

        let decodedBody;
        try {
          // 根据响应的编码类型进行解码
          if (encoding === 'gzip') {
            decodedBody = zlib.gunzipSync(body); // 使用同步方法解压 Gzip
          } else if (encoding === 'deflate') {
            decodedBody = zlib.inflateSync(body); // 使用同步方法解压 Deflate
          } else {
            decodedBody = body; // 如果没有编码，直接使用原始数据
          }
        } catch (err) {
          return res.status(500).json({
            "title": "CORS代理错误-解码失败",
            "detail": err.message,
          });
        }

        handleHtmlResponse(decodedBody.toString(), contentType, res);
      });
    });

    req.pipe(target);
    
  } catch (err) { 
    console.error(err);
    return res.status(500).json({
      "title": "CORS代理错误-内部服务器错误",
      "detail": err.message,
    }); 
  }
});

// 处理 HTML 响应体
function handleHtmlResponse(body, contentType, res) {
  if (contentType.includes('html')) {
    // 添加统计代码到<head>标签中
    const script = `<script charset="UTF-8" id="LA_COLLECT" src="https://testingcf.jsdelivr.net/gh/qdqqd/url-core/js-sdk-pro.min.js"></script>`;
    const modifiedBody = body.replace(/<head>([^<]*)/, `<head>\\$1${script}`);
    res.send(modifiedBody); // 发送修改后的响应
  } else {
    res.send(body); // 如果不是 HTML，直接发送原始响应
  }
}

export default app;
