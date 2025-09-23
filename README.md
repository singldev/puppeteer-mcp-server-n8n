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


## Запуск

Для запуска сервера выполните команду:
```bash
npm start
```


## Использование в n8n

1.  В вашем рабочем процессе n8n добавьте ноду **MCP Client**.
2.  В настройках ноды укажите URL вашего сервера: 
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
