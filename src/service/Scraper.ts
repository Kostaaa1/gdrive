import puppeteer from "puppeteer";
import { ScrapingOpts } from "../types/types.js";
import { cancelOnEscape, stop } from "../utils/utils.js";

type ScrapeMedia = ("img" | "video" | "iframe")[];

export const scrapeMedia = async (
  url: string,
  media: ScrapingOpts[],
  stoppingPeriod: number | null
) => {
  try {
    new URL(url);
  } catch (error) {
    console.log("URL incorrect. Make sure you are using the correct URL.");
    return [];
  }

  console.log(`Scraping ${url}...`);
  const cancel = { value: false };
  const cleanup = cancelOnEscape(cancel);
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
    const triggerInfiniteScroll = async () => {
      while (!cancel.value) {
        previousHeight = currentHeight;
        currentHeight = (await page.evaluate(() => document.body.scrollHeight)) as number;
        if (previousHeight >= currentHeight) break;
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await stop(1200);
      }
    };

    if (!cancel.value) {
      if (stoppingPeriod) {
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, stoppingPeriod)),
          triggerInfiniteScroll(),
        ]);
      } else {
        await triggerInfiniteScroll();
      }
    }
    const parsedMedia = media
      .map((x) => (x === "IMAGE" ? "img" : x === "VIDEO" ? "video" : ""))
      .filter((x) => x.length > 0) as ScrapeMedia;

    const mediaSources = await page.evaluate(async (parsedMedia) => {
      const sources: string[] = [];
      for (const m of parsedMedia) {
        if (m === "video") {
          const s = document.querySelectorAll(m);
          s.forEach((tag) => {
            const source =
              tag.getAttribute("src") ||
              tag.getAttribute("data-mp4") ||
              tag.getAttribute("data-src") ||
              tag.getAttribute("srcset");
            const child = tag.children[0];
            const childSrc =
              child.getAttribute("src") ||
              tag.getAttribute("data-mp4") ||
              tag.getAttribute("data-src") ||
              child.getAttribute("data-src") ||
              child.getAttribute("srcset");
            if (childSrc && !sources.includes(childSrc)) {
              sources.push(childSrc);
            }
            if (source && !sources.includes(source)) {
              sources.push(source);
            }
          });
        } else {
          const s = document.querySelectorAll(m);
          s.forEach((tag) => {
            const source =
              tag.getAttribute("src") ||
              tag.getAttribute("data-src") ||
              tag.getAttribute("srcset");
            if (source && !sources.includes(source)) {
              sources.push(source);
            }
          });
        }
      }
      return sources;
    }, parsedMedia);

    console.log(`Scraping finished, found ${mediaSources.length} URLs.`);
    cleanup();
    await browser.close();
    return mediaSources;
  } catch (err) {
    console.log("Unexpected error. Make sure you are entering the correct URL.");
    return [];
  }
};
