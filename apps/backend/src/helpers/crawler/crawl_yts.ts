import puppeteer from "puppeteer";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const scrapeYTS = async (url: string) => {
  const browser = await puppeteer.launch({
    // executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];

  let success = false;
  let attempts = 0;
  const maxAttempts = 5;

  while (!success && attempts < maxAttempts) {
    let page = null;

    try {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts} for: ${url}`);

      page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      });

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await page.waitForSelector('h1[itemprop="name"], #movie-info h1', {
        timeout: 10000,
      });

      const movieData = await page.evaluate(() => {
        const getTextContent = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : null;
        };

        const getAttribute = (selector, attribute) => {
          const element = document.querySelector(selector);
          return element ? element.getAttribute(attribute) : null;
        };

        let duration = null;
        let language = null;

        const techSpecs = document.querySelectorAll(".tech-spec-element");
        for (const element of techSpecs) {
          const text = element.textContent.trim();
          if (element.querySelector(".icon-clock")) {
            duration = text.replace(/^\s*/, "");
          } else if (element.querySelector(".icon-volume-medium")) {
            language = text.replace(/^\s*/, "");
          }
        }

        const rating = getTextContent('[itemprop="ratingValue"]');
        const posterImg = getAttribute("#movie-poster img", "src");
        const title = getTextContent('h1[itemprop="name"]') || getTextContent("#movie-info h1");

        const genreElement = document.querySelector("#movie-info h2:last-of-type") ||
          document.querySelector("#mobile-movie-info h2:last-of-type");
        const genreText = genreElement?.textContent?.trim();
        const genre = genreText
          ? genreText.split(/\s*\/\s*|\s*\|\s*|\s*,\s*/).map((g) => g.trim()).filter((g) => g && g.length > 0)
          : [];

        const yearElement = document.querySelector("#movie-info h2:first-of-type") ||
          document.querySelector("#mobile-movie-info h2:first-of-type");
        const year = yearElement?.textContent?.trim();

        const links = Array.from(document.querySelectorAll(".modal-torrent"))
          .map((torrentBlock) => {
            const quality = torrentBlock.querySelector(".modal-quality span")?.textContent?.trim();
            const magnet = torrentBlock.querySelector("a.magnet")?.href;
            const sizeElements = torrentBlock.querySelectorAll(".quality-size");
            const size = sizeElements[1]?.textContent?.trim();
            const source = sizeElements[0]?.textContent?.trim();
            return { quality, source, size, magnet };
          })
          .filter((link) => link.magnet && link.quality && link.quality.includes("1080p"));

        return {
          title,
          year,
          duration,
          language,
          rating,
          genre,
          posterImg,
          links,
          scrapedAt: new Date().toISOString(),
        };
      });

      if (!movieData.title) {
        throw new Error("No title found - page may not have loaded correctly");
      }

      results.push({ url, ...movieData });
      console.log(`✅ Scraped: ${movieData.title} (${url})`);
      success = true;
    } catch (error) {
      console.error(`❌ Attempt ${attempts} failed for ${url}:`, error.message);
      const backoffDelay = Math.min(2000 * Math.pow(2, attempts - 1), 30000);

      if (attempts < maxAttempts) {
        console.log(`Retrying in ${backoffDelay}ms...`);
        await wait(backoffDelay);
      } else {
        console.error(`❌ Max attempts reached for ${url}, skipping...`);
        results.push({
          url,
          error: error.message,
          attempts: attempts,
          failedAt: new Date().toISOString(),
        });
      }
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.warn("Error closing page:", closeError.message);
        }
      }
    }
  }

  await browser.close();
  return results;
};
