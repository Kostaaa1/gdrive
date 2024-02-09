from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import requests
import sys
import time
import json

from selenium import webdriver
from bs4 import BeautifulSoup
import time


def scrape_video_sources(url):
    # Initialize a Selenium webdriver
    driver = webdriver.Chrome()
    driver.get(url)
    time.sleep(3)  # Let the page load completely

    # Get page source after it's loaded
    page_source = driver.page_source

    # Close the Selenium webdriver
    driver.quit()

    # Parse the HTML using BeautifulSoup
    soup = BeautifulSoup(page_source, "html.parser")

    # Find video tags and extract sources
    video_tags = soup.find_all("video")
    video_sources = []
    for video_tag in video_tags:
        sources = video_tag.find_all("source")
        for source in sources:
            video_sources.append(source["src"])

    # If no <video> tags were found, look for direct video links
    if not video_sources:
        video_sources = [source["src"] for source in soup.find_all("source")]

    return video_sources


def scrape_iframe_sources(url):
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")
    sources = [iframe["src"] for iframe in soup.find_all("iframe")]
    return sources


# //mydaddy.cc/video/38ccdf8d538de2d6ca/
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py <content_type> <url>")
        sys.exit(1)

    content_type = sys.argv[1]
    url = sys.argv[2]

    if content_type == "video":
        video_sources = scrape_video_sources(url)
        print(json.dumps(video_sources))
    elif content_type == "iframe":
        iframe_sources = scrape_iframe_sources(url)
        for source in iframe_sources:
            print(source)
    else:
        print("Invalid content type. Supported types: 'video', 'iframe'")
        sys.exit(1)
