# Puppeteer MCP Server для n8n

Это адаптированная версия [puppeteer-mcp-server](https://github.com/merajmehrabi/puppeteer-mcp-server), предназначенная для работы с [n8n](https://n8n.io/) через стандартный MCP-клиент.

Этот сервер предоставляет инструменты для автоматизации браузера с помощью Puppeteer, которые можно вызывать из n8n, что позволяет создавать сложные рабочие процессы, взаимодействующие с веб-сайтами.

## Установка

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/singldev/puppeteer-mcp-server-n8n.git
    cd puppeteer-mcp-server-n8n
    ```

2.  **Установите зависимости:**
    ```bash
    npm install
    ```

3.  **Соберите проект:**
    ```bash
    npm run build
    ```

## Настройка

Сервер запускается на порту `8000` по умолчанию. Вы можете изменить порт, установив переменную окружения `PORT`.

Например, чтобы запустить сервер на порту `8888`:
```bash
PORT=8888 npm start
```

### Конфигурация Nginx

Для корректной работы сервера через Nginx, используйте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name mail.ii-assist.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mail.ii-assist.ru;

    ssl_certificate /etc/ssl/ii-assist/ii-assist-full.crt;
    ssl_certificate_key /etc/ssl/ii-assist/ii-assist.key;
    ssl_trusted_certificate /etc/ssl/ii-assist/ii-assist.ca-bundle;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:8000$request_uri;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Для SSE / real-time соединений
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

## Запуск

Для запуска сервера выполните команду:
```bash
npm start
```

После запуска сервер будет доступен по адресу `https://mail.ii-assist.ru/`.

## Использование в n8n

1.  В вашем рабочем процессе n8n добавьте ноду **MCP Client**.
2.  В настройках ноды укажите URL вашего сервера: `https://mail.ii-assist.ru/`.
3.  Теперь вы можете вызывать инструменты Puppeteer, предоставляемые сервером.

### Доступные инструменты

*   `puppeteer_connect_active_tab`: подключается к существующему экземпляру Chrome.
*   `puppeteer_navigate`: переходит по URL-адресу.
*   `puppeteer_screenshot`: делает снимок экрана.
*   `puppeteer_click`: кликает по элементу.
*   `puppeteer_fill`: заполняет поле ввода.
*   `puppeteer_select`: выбирает элемент в теге `select`.
*   `puppeteer_hover`: наводит курсор на элемент.
*   `puppeteer_evaluate`: выполняет код JavaScript.

### Пример рабочего процесса в n8n

1.  **MCP Client**: вызовите инструмент `puppeteer_navigate` с параметром `url`, чтобы открыть нужный сайт.
2.  **MCP Client**: вызовите инструмент `puppeteer_screenshot`, чтобы сделать снимок экрана.
3.  **MCP Client**: вызовите инструмент `puppeteer_click` с параметром `selector`, чтобы нажать на кнопку.