# sketch2finger

用两只手的拇指和食指在摄像头前比出一个"取景框"，框里的画面会实时变成一种艺术风格。手指每合上再张开一次，就随机换一种风格。

Frame part of your webcam view with the thumbs and index fingers of both hands, and everything inside the frame turns into an art style in real time. Each time you close and reopen the frame, it switches to a new random style.

基于 [p5.js](https://p5js.org/) 和 [ml5.js](https://ml5js.org/) 的 HandPose 手部识别模型。纯前端运行，不需要安装依赖，也不需要任何 API 密钥。

Built with [p5.js](https://p5js.org/) and the [ml5.js](https://ml5js.org/) HandPose model. It runs entirely in the browser: no installs, no API keys.

---

## 风格 / Styles

一共 6 种风格。每次打开取景框随机选一种，不会和上一次重复。框的左上角会显示风格的中英文名。

There are 6 styles. Each time the frame opens, one is picked at random, never the same as the previous one. The style name is shown in Chinese and English in the top-left corner of the frame.

| 风格 Style | 效果 | Look |
| --- | --- | --- |
| 黑白 Black & White | 黑白阈值，高对比剪影 | High-contrast black-and-white threshold |
| 彩色卡通 Cartoon | 马卡龙配色、三档赛璐璐上色、梅子色软描边，暗部铺粉色波点，框里飘着会闪的爱心和星星 | Pastel colors, three-tone cel shading, soft plum outlines, pink polka dots in shadows, and twinkling hearts and stars |
| 铅笔速写 Pencil Sketch | 白纸底，灰色轮廓线，暗部有交叉排线 | Gray outlines on white paper with cross-hatching in dark areas |
| 水墨画 Ink Wash | 宣纸底色，浓淡分层的晕染墨色，带飞白的笔触，右下角盖朱红印章 | Rice paper, layered ink washes, dry-brush strokes, and a red seal in the corner |
| 像素风 Pixel Art | 大方块马赛克，颜色数变少 | Large pixel blocks with a reduced color palette |
| 热成像 Thermal | 亮度映射成 蓝 → 紫 → 红 → 橙 → 黄 → 白 | Brightness mapped to blue → purple → red → orange → yellow → white |

---

## 怎么玩 / How to Play

1. 两只手都伸到镜头前，每只手的拇指和食指张开成 "L" 形，像摄影师比取景框一样。
2. 两只手的拇指尖和食指尖一共 4 个点，连成一个四边形，这就是取景框。
3. 框张开到一定大小，框里就会出现一种风格。
4. 把手指捏拢，或者把手移出画面，取景框就会关闭。再次张开时会换成另一种风格。

1. Hold both hands up to the camera and make an "L" with the thumb and index finger of each hand, like a photographer framing a shot.
2. The 4 fingertips (two thumbs, two index fingers) form a four-sided frame.
3. Once the frame is open wide enough, the area inside turns into a style.
4. Pinch your fingers together or move your hands out of view to close the frame. Open it again to get a different style.

> 光线充足、两只手都完整入镜时识别效果最好。
>
> Works best with good lighting and both hands fully in view.

---

## 运行方法 / How to Run

浏览器只允许 `localhost` 或 `https` 页面使用摄像头。直接双击 `index.html`（`file://` 方式打开）通常拿不到摄像头权限，所以需要先启动一个本地服务器。

Browsers only allow camera access on `localhost` or `https` pages. Double-clicking `index.html` (opening it as `file://`) usually won't get camera access, so start a local server first.

**方法一：Python（推荐） / Option 1: Python (recommended)**

```bash
cd sketch2finger
python -m http.server 8000
```

然后在浏览器打开 / Then open: <http://localhost:8000>

**方法二：Node.js / Option 2: Node.js**

```bash
cd sketch2finger
npx serve .
```

然后打开终端里提示的地址，一般是 <http://localhost:3000>。

Then open the address printed in the terminal, usually <http://localhost:3000>.

**方法三：VS Code Live Server / Option 3: VS Code Live Server**

安装 Live Server 插件后，在 `index.html` 上右键，选 "Open with Live Server"。

Install the Live Server extension, right-click `index.html`, and choose "Open with Live Server".

### 首次运行注意 / First Run

- 浏览器会请求摄像头权限，请选择 **允许**。
- 需要联网：p5.js、ml5.js 和 HandPose 模型都从 CDN 加载，第一次加载模型可能要等几秒。
- 推荐使用 Chrome 或 Edge。
- 摄像头画面只在你的浏览器里处理，不会上传到任何服务器。

- The browser will ask for camera permission. Click **Allow**.
- An internet connection is needed: p5.js, ml5.js and the HandPose model load from a CDN, and the model may take a few seconds the first time.
- Chrome or Edge is recommended.
- Camera frames are processed only in your browser and are never uploaded anywhere.

---

## 文件结构 / Files

```
sketch2finger/
├── index.html         # 页面入口，加载 p5.js、ml5.js 和 finger.js / Entry page
├── finger.js          # 主程序：手部识别、开合检测、6 种风格 / Main sketch
├── _styletest.html    # 开发用：不开摄像头，把 6 种风格并排预览 / Dev preview of all styles, no camera
└── README.md
```

`_styletest.html` 使用 `../sketch/img.png` 作为示例图片，所以需要从上一级文件夹 `ClaudeCodeProgram` 启动服务器，再打开 `http://localhost:8000/sketch2finger/_styletest.html`。

`_styletest.html` uses `../sketch/img.png` as its sample image, so start the server from the parent folder `ClaudeCodeProgram` and open `http://localhost:8000/sketch2finger/_styletest.html`.

---

## 自定义 / Customization

**调整开合灵敏度 / Open and close sensitivity**：在 `finger.js` 顶部修改 / Edit the top of `finger.js`:

```js
const OPEN_AREA = 5000;  // 框面积大于它 → 张开 / frame area above this → open
const CLOSE_AREA = 2500; // 框面积小于它 → 合上 / frame area below this → closed
const MISSING_LIMIT = 8; // 手消失超过这么多帧也算合上 / hands missing for this many frames → closed
```

两个面积阈值之间留了空档，手轻微抖动时不会来回切换风格。觉得太难打开就调小 `OPEN_AREA`，觉得太容易乱换就把两个值拉得更开。

The gap between the two area values keeps small hand jitter from flipping the style back and forth. Lower `OPEN_AREA` if the frame is hard to open; widen the gap if styles switch too easily.

**增加或删除风格 / Add or remove styles**：编辑 `STYLES` 列表 / Edit the `STYLES` list:

```js
const STYLES = [
	{ name: '黑白', en: 'Black & White', apply: styleThreshold },
	{ name: '彩色卡通', en: 'Cartoon', apply: styleCartoon, decorate: drawCuteDeco },
	// ...
];
```

- `name` / `en`：显示在框里的中文名和英文名 / Chinese and English names shown in the frame
- `apply(img, x, y)`：处理框内画面的函数，`img` 是 p5.Image，`x`、`y` 是框在画布上的位置 / Function that processes the framed image (`img` is a p5.Image; `x`, `y` are its position on the canvas)
- `decorate(x, y, w, h)`（可选 / optional）：在处理后的画面上再画装饰，比如水墨画的印章、卡通的爱心 / Draws extras on top, like the ink seal or the cartoon hearts

**调整风格细节 / Tweak a style**：颜色等参数写在对应函数旁边的常量里，例如卡通风格的 `CUTE_LINE`（描边色）、`CUTE_DOT`（波点色），水墨画的 `INK_PAPER`（纸色）、`INK_DARK`（墨色）。

Colors and other settings live in constants next to each style function, such as `CUTE_LINE` (outline color) and `CUTE_DOT` (polka-dot color) for Cartoon, or `INK_PAPER` (paper color) and `INK_DARK` (ink color) for Ink Wash.

---

## 常见问题 / Troubleshooting

| 现象 Symptom | 原因 / 解决 Cause / Fix |
| --- | --- |
| 黑屏或没有画面 / Black screen | 没有允许摄像头权限，或摄像头被其他程序（如会议软件）占用。 / Camera permission was denied, or another app (such as a video call) is using the camera. |
| 有画面但没有效果 / Video shows but no effect | 需要两只手同时入镜，框要张开到足够大，光线要充足。 / Both hands must be in view, the frame must be open wide enough, and the lighting must be good. |
| 风格切换太频繁 / Style switches too often | 把 `OPEN_AREA` 和 `CLOSE_AREA` 拉得更开，或调大 `MISSING_LIMIT`。 / Widen the gap between `OPEN_AREA` and `CLOSE_AREA`, or raise `MISSING_LIMIT`. |
| 框很大时有点卡 / Lag with a large frame | 水墨画和卡通风格计算量较大，把框缩小一点即可。 / Ink Wash and Cartoon do more work per frame; make the frame smaller. |
| 控制台报 `ml5 is not defined` | 无法访问 CDN，检查网络。 / The CDN can't be reached; check your connection. |
| 控制台报 `preload` 相关错误 / `preload` errors | p5.js 必须是 1.x 版本，2.x 已经移除了 `preload()`。 / p5.js must be version 1.x; 2.x removed `preload()`. |

---

## 依赖 / Dependencies

- [p5.js](https://p5js.org/) 1.11.1
- [ml5.js](https://ml5js.org/) 1.2.1（HandPose 手部识别模型 / HandPose model）
