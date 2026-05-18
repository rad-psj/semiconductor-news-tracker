import { useMemo, useState } from "react";
import newsData from "./news.json";
import "./index.css";

type RegionId = "KR" | "US";

type Keyword = {
  id: string;
  label: string;
  query: string;
};

type Region = {
  id: RegionId;
  label: string;
  tabLabel: string;
  keywords: Keyword[];
};

type NewsItem = {
  id: string;
  region: RegionId;
  regionLabel: string;
  keywordId: string;
  keywordLabel: string;
  query: string;
  title: string;
  source: string;
  publishedAt: string;
  link: string;
};

type NewsData = {
  updatedAt: string;
  regions: Region[];
  items: NewsItem[];
};

const data = newsData as NewsData;

function formatDate(value: string) {
  if (!value) return "날짜 없음";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getTimeAgo(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
}

export default function App() {
  const [region, setRegion] = useState<RegionId>("KR");
  const [keywordId, setKeywordId] = useState<string>("all");

  const activeRegion = useMemo(() => {
    return data.regions.find((item) => item.id === region) ?? data.regions[0];
  }, [region]);

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      const regionMatch = item.region === region;
      const keywordMatch = keywordId === "all" || item.keywordId === keywordId;

      return regionMatch && keywordMatch;
    });
  }, [region, keywordId]);

  const latestItems = useMemo(() => {
    return filteredItems.slice(0, 6);
  }, [filteredItems]);

  const totalByRegion = useMemo(() => {
    return data.regions.reduce<Record<RegionId, number>>(
      (acc, current) => {
        acc[current.id] = data.items.filter(
          (item) => item.region === current.id
        ).length;
        return acc;
      },
      { KR: 0, US: 0 }
    );
  }, []);

  const hotSources = useMemo(() => {
    const sourceCount = new Map<string, number>();

    filteredItems.forEach((item) => {
      sourceCount.set(item.source, (sourceCount.get(item.source) ?? 0) + 1);
    });

    return [...sourceCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredItems]);

  return (
    <main className="app">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="radar-badge">
            <span className="pulse-dot" />
            Live RSS Radar
          </div>

          <h1>
            Semiconductor
            <br />
            News Tracker
          </h1>

          <p>
            한국과 미국의 반도체, AI칩, HBM, 파운드리, 주요 칩메이커 뉴스를
            Google News RSS 기반으로 추적합니다.
          </p>
        </div>

        <div className="radar-card">
          <div className="radar-visual">
            <span />
            <span />
            <span />
            <div className="radar-sweep" />
          </div>

          <div className="radar-stats">
            <div>
              <span>Total Articles</span>
              <strong>{data.items.length}</strong>
            </div>
            <div>
              <span>Current View</span>
              <strong>{filteredItems.length}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{formatDate(data.updatedAt)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="control-panel">
        <div className="region-tabs">
          {data.regions.map((item) => (
            <button
              key={item.id}
              className={region === item.id ? "active" : ""}
              onClick={() => {
                setRegion(item.id);
                setKeywordId("all");
              }}
            >
              <span>{item.label}</span>
              <strong>{item.tabLabel}</strong>
              <em>{totalByRegion[item.id]}</em>
            </button>
          ))}
        </div>

        <div className="keyword-row">
          <button
            className={keywordId === "all" ? "active" : ""}
            onClick={() => setKeywordId("all")}
          >
            {region === "KR" ? "전체" : "All"}
          </button>

          {activeRegion.keywords.map((keyword) => (
            <button
              key={keyword.id}
              className={keywordId === keyword.id ? "active" : ""}
              onClick={() => setKeywordId(keyword.id)}
            >
              {keyword.label}
            </button>
          ))}
        </div>
      </section>

      <section className="insight-grid">
        <article className="insight-card primary">
          <span>Active Region</span>
          <strong>{activeRegion.label}</strong>
          <p>{activeRegion.tabLabel} semiconductor news stream</p>
        </article>

        <article className="insight-card">
          <span>Keyword</span>
          <strong>
            {keywordId === "all"
              ? region === "KR"
                ? "전체"
                : "All"
              : activeRegion.keywords.find((item) => item.id === keywordId)
                  ?.label}
          </strong>
          <p>선택한 키워드 기준으로 뉴스가 필터링됩니다.</p>
        </article>

        <article className="insight-card">
          <span>Sources</span>
          <strong>{hotSources.length}</strong>
          <p>현재 화면에서 감지된 주요 뉴스 출처 수</p>
        </article>
      </section>

      <section className="content-layout">
        <div className="main-feed">
          <div className="section-header">
            <div>
              <span>Latest Signal</span>
              <h2>뉴스 피드</h2>
            </div>
            <p>{filteredItems.length} articles detected</p>
          </div>

          <div className="news-list">
            {filteredItems.length === 0 ? (
              <article className="empty-card">
                <h3>뉴스가 아직 없습니다</h3>
                <p>
                  로컬에서 <code>npm run fetch-news</code>를 실행하면 최신
                  RSS 뉴스가 채워집니다.
                </p>
              </article>
            ) : (
              filteredItems.map((item) => (
                <article className="news-card" key={item.id}>
                  <div className="news-topline">
                    <span>{item.keywordLabel}</span>
                    <time dateTime={item.publishedAt}>
                      {getTimeAgo(item.publishedAt)}
                    </time>
                  </div>

                  <h3>
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  </h3>

                  <div className="news-footer">
                    <span>{item.source}</span>
                    <a href={item.link} target="_blank" rel="noreferrer">
                      Open article
                    </a>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="side-panel">
          <div className="section-header compact">
            <div>
              <span>Briefing</span>
              <h2>Top Signals</h2>
            </div>
          </div>

          <div className="briefing-list">
            {latestItems.map((item, index) => (
              <a
                className="briefing-item"
                href={item.link}
                target="_blank"
                rel="noreferrer"
                key={`${item.id}-${index}`}
              >
                <em>{String(index + 1).padStart(2, "0")}</em>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.source} · {formatDate(item.publishedAt)}
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="source-box">
            <span>Hot Sources</span>

            {hotSources.length === 0 ? (
              <p>아직 표시할 출처가 없습니다.</p>
            ) : (
              hotSources.map(([source, count]) => (
                <div className="source-row" key={source}>
                  <strong>{source}</strong>
                  <em>{count}</em>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}