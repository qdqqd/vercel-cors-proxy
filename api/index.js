import express from 'express';
import cors from 'cors';
import request from 'request';
import zlib from 'zlib';
import brotli from 'brotli'; // 确保安装该库

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

      const chunks = [];
      const isGzip = targetResponse.headers['content-encoding'] === 'gzip';
      const isBrotli = targetResponse.headers['content-encoding'] === 'br';
      
      targetResponse.on('data', chunk => {
        chunks.push(chunk);
      });

      targetResponse.on('end', () => {
        let bodyBuffer = Buffer.concat(chunks);
        
        if (isBrotli) {
          const decoded = brotli.decompress(bodyBuffer);
          handleHtmlResponse(decoded.toString('utf-8'), contentType, res);
        } else if (isGzip) {
          zlib.gunzip(bodyBuffer, (err, decoded) => {
            if (err) {
              return res.status(500).json({
                "title": "CORS代理错误-解压缩失败",
                "detail": err.message,
              });
            }
            handleHtmlResponse(decoded.toString('utf-8'), contentType, res);
          });
        } else {
          handleHtmlResponse(bodyBuffer.toString('utf-8'), contentType, res);
        }
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
    const script = `<script charset="UTF-8" id="LA_COLLECT" src="https://testingcf.jsdelivr.net/gh/qdqqd/url-core/js-sdk-pro.min.js"></script>`;
    const modifiedBody = body.replace(/<head>([^<]*)/, `<head>\\$1${script}`);
    res.send(modifiedBody);
  } else {
    res.send(body);
  }
}

export default app;
