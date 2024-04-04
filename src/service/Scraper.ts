import puppeteer from "puppeteer";
import { ScrapingOpts } from "../types/types.js";
import { stop } from "../utils/utils.js";

type ScrapeMedia = ("img" | "video" | "source" | "iframe")[];

export const scrapeMedia = async (
  url: string,
  media: ScrapingOpts[],
  stoppingPeriod: number | null
) => {
  console.log(`Scrapiing ${url}...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.9999.99 Safari/537.36"
  );

  await page.goto(url, { waitUntil: ["networkidle2", "load"] });
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  try {
    let previousHeight;
    let currentHeight = 0;

    const parsedMedia = media
      .map((x) => (x === "IMAGE" ? "img" : x === "VIDEO" ? "video" : ""))
      .filter((x) => x.length > 0) as ScrapeMedia;
    if (parsedMedia.includes("video")) parsedMedia.push("source");

    const triggerInfiniteScroll = async () => {
      while (true) {
        previousHeight = currentHeight;
        currentHeight = (await page.evaluate("document.body.scrollHeight")) as number;
        if (previousHeight >= currentHeight) break;
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await stop(2000);
      }
    };

    if (stoppingPeriod) {
      await Promise.race([
        new Promise((resolve) => setTimeout(resolve, stoppingPeriod)),
        await triggerInfiniteScroll(),
      ]);
    } else {
      await triggerInfiniteScroll();
    }

    const mediaSources = await page.evaluate(async (parsedMedia) => {
      const sources: string[] = [];
      for (const m of parsedMedia) {
        const s = document.querySelectorAll(m);
        s.forEach((tag) => {
          const source = tag.getAttribute("src") || tag.getAttribute("data-src");
          if (source) {
            sources.push(source);
          }
        });
      }
      return sources;
    }, parsedMedia);

    return mediaSources;
  } catch (err) {
    console.log(err);
    return [];
  } finally {
    await browser.close();
  }
};
