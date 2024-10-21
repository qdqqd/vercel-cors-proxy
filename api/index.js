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

      let body = '';
      
      // 判断响应是否被 Gzip 压缩
      const isGzip = targetResponse.headers['content-encoding'] === 'gzip';
      
      targetResponse.on('data', chunk => {
        body += chunk;
      });

      targetResponse.on('end', () => {
        if (isGzip) {
          // 解压 Gzip
          zlib.gunzip(Buffer.from(body, 'binary'), (err, decoded) => {
            if (err) {
              return res.status(500).json({
                "title": "CORS代理错误-解压缩失败",
                "detail": err.message,
              });
            }
            handleHtmlResponse(decoded.toString(), contentType, res);
          });
        } else {
          handleHtmlResponse(body, contentType, res);
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
    // 添加统计代码到<head>标签中
    const script = `<script charset="UTF-8" id="LA_COLLECT" src="https://testingcf.jsdelivr.net/gh/qdqqd/url-core/js-sdk-pro.min.js"></script>`;
    const modifiedBody = body.replace(/<head>([^<]*)/, `<head>\$1${script}`);
    res.send(modifiedBody); // 发送修改后的响应
  } else {
    res.send(body); // 如果不是 HTML，直接发送原始响应
  }
}

export default app;
