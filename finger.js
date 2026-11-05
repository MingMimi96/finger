let handPose; //carrega o modelo
let video; // variavel de video
let hands = [];

// ================= 风格 =================
// 每次手指框"合上 → 张开"，随机换一种（不会和上一次重复）
const STYLES = [
	{ name: '黑白', en: 'Black & White', apply: styleThreshold },
	{ name: '彩色卡通', en: 'Cartoon', apply: styleCartoon, decorate: drawCuteDeco },
	{ name: '铅笔速写', en: 'Pencil Sketch', apply: stylePencil },
	{ name: '水墨画', en: 'Ink Wash', apply: styleInk, decorate: drawSeal },
	{ name: '像素风', en: 'Pixel Art', apply: stylePixel },
	{ name: '热成像', en: 'Thermal', apply: styleThermal },
];

let styleIndex = -1;   // 当前风格，-1 表示还没打开过
let isOpen = false;    // 手指框当前是否处于"张开"状态
let missingFrames = 0; // 连续没检测到两只手的帧数

// 用框的面积判断开合，两个阈值之间留缓冲，避免抖动时来回切换
const OPEN_AREA = 5000;  // 面积大于它 → 张开
const CLOSE_AREA = 2500; // 面积小于它 → 合上
const MISSING_LIMIT = 8; // 手消失超过这么多帧，也算合上

function preload(){
	handPose = ml5.handPose();
	//garante que o modelo seja carregado antes do setup e draw
}


// 摄像头画面的尺寸。手部识别和风格处理都在这个尺寸上做，最后再整体放大铺满屏幕
const VIDEO_W = 640;
const VIDEO_H = 480;

function setup() {
	pixelDensity(1); // 保证像素数组和画面一一对应
	createCanvas(windowWidth, windowHeight); // 画布铺满整个窗口

	//Vai buscar o video da webcam e esconder
	// facingMode: 'user' → 手机上用前置摄像头
	video = createCapture({ video: { facingMode: 'user' }, audio: false });
	video.size(VIDEO_W, VIDEO_H);
	video.hide();

	//vai começar a detectar os keypoints da mãos
	handPose.detectStart(video, gotHands);
}

// 窗口大小变化（拖动窗口、手机横竖屏切换）时，画布跟着变
function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}


function draw() {
	background(0);

	// 把 640×480 的画面等比放大到盖满屏幕（多出来的边会被裁掉，不留黑边）
	const s = Math.max(width / VIDEO_W, height / VIDEO_H);
	push();
	translate((width - VIDEO_W * s) / 2, (height - VIDEO_H * s) / 2);
	scale(s);
	drawScene();
	pop();
}


// 在 640×480 的坐标系里画：摄像头画面 + 手指框里的风格
function drawScene() {
	image(video, 0, 0, VIDEO_W, VIDEO_H);

	if (hands.length < 2) {
		missingFrames++;
		if (missingFrames > MISSING_LIMIT) isOpen = false;
		return;
	}
	missingFrames = 0;

	let mao1 = hands[0];
	let mao2 = hands[1];

	let polegar1 = mao1.keypoints[4];
	let indicador1 = mao1.keypoints[8];
	let polegar2 = mao2.keypoints[4];
	let indicador2 = mao2.keypoints[8];

	let pontosX = [polegar1.x, indicador1.x, indicador2.x, polegar2.x];
	let pontosY = [polegar1.y, indicador1.y, indicador2.y, polegar2.y];

	// 取整并限制在摄像头画面内
	let minX = max(0, floor(min(pontosX)));
	let maxX = min(VIDEO_W, ceil(max(pontosX)));
	let minY = max(0, floor(min(pontosY)));
	let maxY = min(VIDEO_H, ceil(max(pontosY)));

	let largura = maxX - minX;
	let altura = maxY - minY;
	if (largura <= 0 || altura <= 0) return;

	updateOpenState(largura * altura);
	if (!isOpen) return;

	let style = STYLES[styleIndex];

	let regiao = video.get(minX, minY, largura, altura);
	style.apply(regiao, minX, minY); // 传入位置，让纸纹固定在画面上，不跟着框漂

	let mascara = createGraphics(largura, altura);
	mascara.fill(255); //precisa de preenchimento para funcionar
	mascara.noStroke();
	mascara.beginShape();
	for (let i = 0; i < 4; i++) {
		mascara.vertex(pontosX[i] - minX, pontosY[i] - minY);
	}
	mascara.endShape(CLOSE);

	// aplica a mascara
	regiao.mask(mascara);
	mascara.remove();

	// imagem final
	image(regiao, minX, minY);
	if (style.decorate) style.decorate(minX, minY, largura, altura);

	// 文字：白字黑边，在浅色风格（铅笔、水墨）上也看得清
	fill(255);
	stroke(0);
	strokeWeight(3);
	textSize(20);
	text(style.name, minX + 40, minY + 40);
	textSize(14);
	text(style.en, minX + 40, minY + 60);
	noStroke();
}


function gotHands(results){
	//salva o resultado de gotHands em hands
	hands = results;
}


// ================= 开合检测 =================

function updateOpenState(area) {
	if (!isOpen && area > OPEN_AREA) {
		isOpen = true;
		nextStyle();
	} else if (isOpen && area < CLOSE_AREA) {
		isOpen = false;
	}
}

function nextStyle() {
	let next;
	do {
		next = floor(random(STYLES.length));
	} while (next === styleIndex && STYLES.length > 1);
	styleIndex = next;
}


// ================= 像素工具 =================

function clamp255(v) {
	return v < 0 ? 0 : v > 255 ? 255 : v;
}

// 把 0–255 的值量化成 levels+1 档
function quant(v, levels) {
	return Math.round(clamp255(v) / 255 * levels) / levels * 255;
}

function grayOf(p, n) {
	const g = new Float32Array(n);
	for (let i = 0, j = 0; i < n; i++, j += 4) {
		g[i] = 0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2];
	}
	return g;
}

// 3×3 均值模糊，去掉摄像头噪点
function boxBlur(g, w, h) {
	const out = new Float32Array(g);
	for (let y = 1; y < h - 1; y++) {
		for (let x = 1; x < w - 1; x++) {
			const i = y * w + x;
			out[i] = (g[i - w - 1] + g[i - w] + g[i - w + 1] +
			          g[i - 1]     + g[i]     + g[i + 1] +
			          g[i + w - 1] + g[i + w] + g[i + w + 1]) / 9;
		}
	}
	return out;
}

// Sobel 边缘强度
function edgesOf(g, w, h) {
	const e = new Float32Array(w * h);
	for (let y = 1; y < h - 1; y++) {
		for (let x = 1; x < w - 1; x++) {
			const i = y * w + x;
			const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1]
			           + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
			const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1]
			           + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
			e[i] = Math.sqrt(gx * gx + gy * gy);
		}
	}
	return e;
}

// 任意半径的均值模糊（横竖各扫一遍，速度和半径无关）
function blurR(src, w, h, r) {
	const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
	const k = 1 / (2 * r + 1);
	for (let y = 0; y < h; y++) {
		const row = y * w;
		let sum = 0;
		for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
		for (let x = 0; x < w; x++) {
			tmp[row + x] = sum * k;
			sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
		}
	}
	for (let x = 0; x < w; x++) {
		let sum = 0;
		for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
		for (let y = 0; y < h; y++) {
			out[y * w + x] = sum * k;
			sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
		}
	}
	return out;
}

// 0–255 数组的百分位数（例如 0.05 = 比 5% 的像素亮）
function percentile(arr, q) {
	const hist = new Uint32Array(256);
	for (let i = 0; i < arr.length; i++) hist[arr[i] | 0]++;
	const target = arr.length * q;
	let acc = 0;
	for (let v = 0; v < 256; v++) {
		acc += hist[v];
		if (acc >= target) return v;
	}
	return 255;
}

function smoothstep(a, b, v) {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

// 固定的伪随机数（同一位置每帧一样，不会闪烁），返回 0–1
function hash2(x, y) {
	let h = (x * 374761393 + y * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) & 0xffff) / 65535;
}

// 平滑的值噪声，用来做墨色的浓淡不均和纸张纹理，返回 0–1
function vnoise(x, y) {
	const xi = Math.floor(x), yi = Math.floor(y);
	let u = x - xi, v = y - yi;
	u = u * u * (3 - 2 * u);
	v = v * v * (3 - 2 * v);
	const a = hash2(xi, yi), b = hash2(xi + 1, yi);
	const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
	return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}


// ================= 各个风格 =================

// 黑白：原版的阈值效果
function styleThreshold(img) {
	img.filter(THRESHOLD);
}

// 彩色卡通：柔和马卡龙色 + 三档赛璐璐上色 + 梅子色软描边 + 暗部粉色波点
const CUTE_LINE = [96, 52, 88];    // 描边：深梅子色，比纯黑柔和
const CUTE_DOT = [255, 176, 204];  // 暗部的粉色波点
const CUTE_BANDS = [108, 188, 240]; // 三档亮度：暗、中、亮

function styleCartoon(img, ox = 0, oy = 0) {
	img.loadPixels();
	const p = img.pixels, w = img.width, h = img.height, n = w * h;

	// 分通道柔化，让色块平滑干净
	let R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
	for (let i = 0, j = 0; i < n; i++, j += 4) {
		R[i] = p[j]; G[i] = p[j + 1]; B[i] = p[j + 2];
	}
	R = blurR(R, w, h, 2); G = blurR(G, w, h, 2); B = blurR(B, w, h, 2);
	const gray = grayOf(p, n);
	const e = blurR(edgesOf(blurR(gray, w, h, 1), w, h), w, h, 1);
	const soft = blurR(gray, w, h, 5); // 用更平滑的亮度来分档，色块交界不会毛躁

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x, j = i * 4;
			let r = R[i], g = G[i], b = B[i];
			const band = soft[i] < 80 ? 0 : soft[i] < 160 ? 1 : 2;

			// 提高饱和度
			const avg = (r + g + b) / 3;
			r = avg + (r - avg) * 1.9;
			g = avg + (g - avg) * 1.9;
			b = avg + (b - avg) * 1.9;

			// 赛璐璐上色：亮度只保留三档，色相不变
			const lum = 0.299 * r + 0.587 * g + 0.114 * b;
			const k = CUTE_BANDS[band] / Math.max(lum, 1);
			r *= k; g *= k; b *= k;

			// 往白色里调一点，变成马卡龙色
			r = clamp255(r) * 0.72 + 255 * 0.28;
			g = clamp255(g) * 0.72 + 255 * 0.28;
			b = clamp255(b) * 0.72 + 255 * 0.28;

			// 暗部铺粉色波点（交错排列，固定在屏幕上）
			if (band === 0) {
				const nx = x + ox, ny = y + oy;
				const row = Math.floor(ny / 10);
				const dx = ((nx + (row % 2) * 5) % 10 + 10) % 10 - 5;
				const dy = (ny % 10 + 10) % 10 - 5;
				if (dx * dx + dy * dy < 6) {
					r = r * 0.4 + CUTE_DOT[0] * 0.6;
					g = g * 0.4 + CUTE_DOT[1] * 0.6;
					b = b * 0.4 + CUTE_DOT[2] * 0.6;
				}
			}

			// 软描边
			const a = smoothstep(45, 115, e[i]);
			p[j]     = r + (CUTE_LINE[0] - r) * a;
			p[j + 1] = g + (CUTE_LINE[1] - g) * a;
			p[j + 2] = b + (CUTE_LINE[2] - b) * a;
		}
	}
	img.updatePixels();
}

// 卡通框里飘几颗会一闪一闪的爱心和星星
const CUTE_DECO = [
	[0.24, 0.32, 'heart'], [0.78, 0.3, 'star'], [0.7, 0.74, 'heart'],
	[0.3, 0.72, 'star'], [0.52, 0.22, 'star'],
];

function drawCuteDeco(x, y, w, h) {
	if (w < 90 || h < 90) return; // 框太小就不画
	const t = frameCount * 0.08;
	const base = Math.min(w, h) * 0.06;

	push();
	stroke(CUTE_LINE[0], CUTE_LINE[1], CUTE_LINE[2]);
	strokeWeight(1.5);
	CUTE_DECO.forEach(([fx, fy, kind], idx) => {
		const s = base * (1 + 0.25 * Math.sin(t + idx * 1.7)); // 一大一小地闪
		const px = x + w * fx;
		const py = y + h * fy + Math.sin(t * 0.6 + idx) * 3;  // 轻轻上下飘
		if (kind === 'heart') {
			fill(255, 128, 172);
			drawHeart(px, py, s);
		} else {
			fill(255, 236, 140);
			drawSparkle(px, py, s);
		}
	});
	pop();
}

function drawHeart(x, y, s) {
	beginShape();
	vertex(x, y + s * 0.8);
	bezierVertex(x - s * 1.3, y, x - s * 0.7, y - s * 1.0, x, y - s * 0.35);
	bezierVertex(x + s * 0.7, y - s * 1.0, x + s * 1.3, y, x, y + s * 0.8);
	endShape(CLOSE);
}

function drawSparkle(x, y, s) {
	const q = s * 0.28;
	beginShape();
	vertex(x, y - s); vertex(x + q, y - q);
	vertex(x + s, y); vertex(x + q, y + q);
	vertex(x, y + s); vertex(x - q, y + q);
	vertex(x - s, y); vertex(x - q, y - q);
	endShape(CLOSE);
}

// 铅笔速写：白纸 + 灰色线条 + 暗部排线
function stylePencil(img) {
	img.loadPixels();
	const p = img.pixels, w = img.width, h = img.height, n = w * h;
	const g = boxBlur(grayOf(p, n), w, h);
	const e = edgesOf(g, w, h);

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x, j = i * 4;
			let v = 248 - Math.min(190, e[i] * 0.9);       // 轮廓线
			if (g[i] < 130 && (x + y) % 5 === 0) v -= 45;   // 第一层排线
			if (g[i] < 75 && ((x - y) % 5 + 5) % 5 === 0) v -= 55; // 交叉排线
			v = Math.max(v, 45);
			p[j] = v; p[j + 1] = v; p[j + 2] = v * 0.97 + 6;
		}
	}
	img.updatePixels();
}

// 水墨画：宣纸 + 大片淡墨晕染 + 带飞白的浓墨笔触 + 笔触边缘洇开
const INK_PAPER = [241, 233, 214]; // 宣纸
const INK_PAPER_OLD = [230, 216, 186]; // 纸边泛黄
const INK_LIGHT = [104, 112, 118]; // 淡墨略带青灰
const INK_DARK = [16, 16, 20];     // 焦墨

function styleInk(img, ox = 0, oy = 0) {
	img.loadPixels();
	const p = img.pixels, w = img.width, h = img.height, n = w * h;
	const g0 = grayOf(p, n);
	const e = blurR(edgesOf(blurR(g0, w, h, 2), w, h), w, h, 1); // 笔触（略加粗）
	const wash = blurR(g0, w, h, 6);             // 淡墨晕染：大范围模糊
	const bleed = blurR(e, w, h, 4);             // 笔触边缘洇墨
	const cx = w / 2, cy = h / 2, maxD = Math.hypot(cx, cy) || 1;

	// 按框内自己的明暗范围拉开对比：最亮处留白，最暗处焦墨
	const lo = percentile(wash, 0.03), hi = percentile(wash, 0.7);
	const range = Math.max(30, hi - lo);

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x, j = i * 4;
			const nx = x + ox, ny = y + oy;

			const cloud = vnoise(nx / 50, ny / 50); // 墨色浓淡不均
			const brush = vnoise(nx / 14, ny / 14); // 笔触粗细、轻重变化
			const dry = vnoise(nx / 4, ny / 4) * 0.7 + hash2(nx, ny) * 0.3; // 飞白

			// 淡墨：亮处留白，越暗墨越浓，最暗处接近焦墨
			const dark = (hi - wash[i]) / range + (cloud - 0.5) * 0.25;
			const washT = smoothstep(0.1, 1.0, dark) * 0.9;

			// 浓墨笔触：粗细随 brush 变化，被 dry 打出飞白
			let stroke = smoothstep(25 + brush * 45, 95 + brush * 45, e[i]);
			stroke *= 0.3 + 0.7 * smoothstep(0.2, 0.55, dry);

			// 洇墨光晕
			const halo = smoothstep(10, 90, bleed[i]) * 0.22;

			// 几层墨叠在一起
			const t = 1 - (1 - washT) * (1 - stroke) * (1 - halo);

			// 纸：中心白、四周泛黄，再加细纤维颗粒
			const edge = smoothstep(0.7, 1.05, Math.hypot(x - cx, y - cy) / maxD);
			const grain = (hash2(nx, ny) - 0.5) * 10 + (cloud - 0.5) * 8;

			for (let c = 0; c < 3; c++) {
				const paper = INK_PAPER[c] + (INK_PAPER_OLD[c] - INK_PAPER[c]) * edge + grain;
				const ink = INK_LIGHT[c] + (INK_DARK[c] - INK_LIGHT[c]) * t;
				p[j + c] = paper + (ink - paper) * t;
			}
		}
	}
	img.updatePixels();
}

// 水墨画右下角盖一方朱红印章（略透明，像印泥印在纸上）
function drawSeal(x, y, w, h) {
	const s = 32;
	const sx = x + w - s - 14, sy = y + h - s - 14;
	if (sx < x + 4 || sy < y + 4) return; // 框太小就不盖

	push();
	noStroke();
	fill(178, 32, 28, 215);
	rect(sx, sy, s, s, 2);
	noFill();
	stroke(241, 233, 214, 200);
	strokeWeight(1.5);
	rect(sx + 3, sy + 3, s - 6, s - 6, 1);
	noStroke();
	fill(241, 233, 214, 230);
	textAlign(CENTER, CENTER);
	textSize(19);
	textStyle(BOLD);
	text('墨', sx + s / 2, sy + s / 2 + 1);
	pop();
}

// 像素风：大方块 + 减少颜色数
function stylePixel(img) {
	img.loadPixels();
	const p = img.pixels, w = img.width, h = img.height;
	const size = 10;

	for (let by = 0; by < h; by += size) {
		for (let bx = 0; bx < w; bx += size) {
			const ex = Math.min(bx + size, w), ey = Math.min(by + size, h);
			let r = 0, g = 0, b = 0, c = 0;
			for (let y = by; y < ey; y++) {
				for (let x = bx; x < ex; x++) {
					const j = (y * w + x) * 4;
					r += p[j]; g += p[j + 1]; b += p[j + 2]; c++;
				}
			}
			r = quant(r / c, 5); g = quant(g / c, 5); b = quant(b / c, 5);
			for (let y = by; y < ey; y++) {
				for (let x = bx; x < ex; x++) {
					const j = (y * w + x) * 4;
					p[j] = r; p[j + 1] = g; p[j + 2] = b;
				}
			}
		}
	}
	img.updatePixels();
}

// 热成像：亮度映射到 蓝 → 紫 → 红 → 橙 → 黄 → 白
const THERMAL = [[0, 0, 40], [70, 0, 150], [200, 0, 120], [255, 80, 0], [255, 220, 0], [255, 255, 255]];

function styleThermal(img) {
	img.loadPixels();
	const p = img.pixels, n = img.width * img.height;
	const g = grayOf(p, n);
	const last = THERMAL.length - 1;

	for (let i = 0, j = 0; i < n; i++, j += 4) {
		const f = g[i] / 255 * last;
		const k = Math.min(last - 1, Math.floor(f));
		const t = f - k;
		const a = THERMAL[k], b = THERMAL[k + 1];
		p[j]     = a[0] + (b[0] - a[0]) * t;
		p[j + 1] = a[1] + (b[1] - a[1]) * t;
		p[j + 2] = a[2] + (b[2] - a[2]) * t;
	}
	img.updatePixels();
}
