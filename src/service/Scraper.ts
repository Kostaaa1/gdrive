import puppeteer from "puppeteer";
import axios from "axios";
import { Readable } from "stream";
import { ScrapingOpts } from "../types/types.js";
import { isBase64, isExtensionValid, stop } from "../utils/utils.js";

export class Scraper {
  async scrapeMedia(
    url: string,
    type: ScrapingOpts,
    timeToScrape: number = 15000
  ): Promise<string[]> {
    console.log(`Scraping ${url}...`);
    const browser = await puppeteer.launch({ defaultViewport: null });
    const page = await browser.newPage();
    await page.goto(url);

    // const currentUrl = page.url();
    // if (currentUrl !== url) {
    //   console.log("\nMake sure you have entered the correct url");
    //   await browser.close();
    //   return [];
    // }

    const media = {
      IMAGES: "img",
      VIDEOS: "video source",
    }[type] as "img" | "video source";

    await page.waitForSelector(media);
    let imgSources: any[] = [];

    const extractSources = async () => {
      imgSources = await page.$$eval(media, (images) => {
        return images.map(({ src, getAttribute }) => src || getAttribute("data-src"));
      });
    };

    let previousHeight = 0;
    const timeoutPromise = new Promise((res) => {
      setTimeout(res, timeToScrape);
    });

    await Promise.race([
      timeoutPromise,
      (async () => {
        while (true) {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });

          await stop(2000);
          await extractSources();

          const newHeight = await page.evaluate(() => {
            return document.body.scrollHeight;
          });

          if (newHeight === previousHeight) break;
          previousHeight = newHeight;
        }
      })(),
    ]);

    await browser.close();
    console.log(`Scraping done. Found ${imgSources.length} items.`);
    // Maybe filter the urls without ext???
    return imgSources.filter((x, i, arr) => arr.indexOf(x) === i);
  }
}
