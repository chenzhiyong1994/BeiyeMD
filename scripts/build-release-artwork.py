"""Build the BeiyeMD 1.0 social poster from checked-in release artwork."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "docs" / "social" / "beiyemd-v1.0-background.png"
SCREENSHOT = ROOT / "docs" / "screenshots" / "beiyemd-workspace.png"
ICON = ROOT / "resources" / "icon.png"
OUTPUT = ROOT / "docs" / "social" / "beiyemd-v1.0-moments.png"

FONT_REGULAR = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")

INK = "#111111"
MUTED = "#62625F"
PAPER = "#FFFFFF"
SOFT = "#F3F3F1"
CORAL = "#D85F42"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


def rounded_image(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius, fill=255)
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.paste(image.convert("RGBA"), mask=mask)
    return result


def clean_workspace_screenshot(path: Path) -> Image.Image:
    screenshot = Image.open(path).convert("RGB")
    # Computer-use captures show a blue pointer locator. It sits in an otherwise
    # empty title-bar segment, so replace that segment with the native bar color.
    bar_color = screenshot.getpixel((1500, 20))
    ImageDraw.Draw(screenshot).rectangle((1600, 0, 1760, 49), fill=bar_color)
    screenshot.save(path, optimize=True)
    return screenshot


def paste_with_shadow(canvas: Image.Image, image: Image.Image, xy: tuple[int, int], radius: int = 24) -> None:
    x, y = xy
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (x - 10, y + 12, x + image.width + 10, y + image.height + 34),
        radius + 8,
        fill=(0, 0, 0, 54),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(24)))
    canvas.alpha_composite(rounded_image(image, radius), (x, y))


def feature_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], number: str, title: str, body: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, 24, fill=(255, 255, 255, 236), outline="#D8D8D4", width=2)
    draw.text((x1 + 28, y1 + 24), number, font=font(19, True), fill=CORAL)
    draw.text((x1 + 28, y1 + 58), title, font=font(29, True), fill=INK)
    draw.text((x1 + 28, y1 + 105), body, font=font(20), fill=MUTED, spacing=8)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    background = Image.open(BACKGROUND).convert("RGB")
    canvas = ImageOps.fit(background, (1080, 1920), method=Image.Resampling.LANCZOS).convert("RGBA")
    canvas.alpha_composite(Image.new("RGBA", canvas.size, (255, 255, 255, 92)))
    draw = ImageDraw.Draw(canvas)

    # Brand row.
    icon = Image.open(ICON).convert("RGBA")
    icon.thumbnail((82, 82), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, (74, 72))
    draw.text((178, 72), "北页", font=font(38, True), fill=INK)
    draw.text((180, 121), "BEIYEMD", font=font(17, True), fill=MUTED)
    draw.rounded_rectangle((760, 78, 1002, 132), 27, fill=INK)
    draw.text((789, 92), "OPEN SOURCE · v1.0", font=font(18, True), fill=PAPER)

    # Headline.
    draw.text((76, 220), "把每一页，", font=font(78, True), fill=INK)
    draw.text((76, 320), "写成自己的节奏。", font=font(78, True), fill=INK)
    draw.rectangle((80, 436, 162, 444), fill=CORAL)
    draw.text((80, 475), "本地优先的多文档 Markdown 编辑器", font=font(31, True), fill=INK)
    draw.text((80, 528), "不必登录，不必导入。打开本地文件，就可以开始。", font=font(22), fill=MUTED)

    # Product frame.
    screenshot = clean_workspace_screenshot(SCREENSHOT)
    screenshot = screenshot.crop((0, 50, screenshot.width, screenshot.height))
    screenshot = ImageOps.fit(screenshot, (932, 500), method=Image.Resampling.LANCZOS)
    paste_with_shadow(canvas, screenshot, (74, 638), radius=26)
    draw.rounded_rectangle((102, 664, 368, 714), 25, fill=(17, 17, 17, 230))
    draw.text((127, 676), "一个窗口，多份文档", font=font(19, True), fill=PAPER)

    # Feature grid.
    feature_card(draw, (74, 1215, 518, 1395), "01", "多文档工作区", "批量打开 · 快速切换\n跨文档搜索")
    feature_card(draw, (562, 1215, 1006, 1395), "02", "预览 × 源码", "看清排版 · 固定行号\n查找命中高亮")
    feature_card(draw, (74, 1420, 518, 1600), "03", "Markdown 检查", "标题 · 表格 · 图片\n常见语法问题")
    feature_card(draw, (562, 1420, 1006, 1600), "04", "细节也能直接调", "拖拽列宽 · 图片缩放\n五套写作主题")

    # Footer call-to-action.
    draw.rounded_rectangle((74, 1665, 1006, 1844), 34, fill=INK)
    draw.text((110, 1704), "现在开源，欢迎来用。", font=font(34, True), fill=PAPER)
    draw.text((110, 1760), "github.com/chenzhiyong1994/BeiyeMD", font=font(22), fill="#D7D7D2")
    draw.rounded_rectangle((782, 1710, 958, 1798), 44, fill=CORAL)
    draw.text((825, 1728), "给颗 Star", font=font(26, True), fill=PAPER)
    draw.text((78, 1872), "BEIYEMD 1.0 · WINDOWS", font=font(16, True), fill=MUTED)
    draw.text((762, 1872), "文件留在本地", font=font(16, True), fill=MUTED)

    canvas.convert("RGB").save(OUTPUT, quality=95, optimize=True, subsampling=0)
    print(OUTPUT)


if __name__ == "__main__":
    main()
