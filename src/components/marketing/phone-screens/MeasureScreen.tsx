import type { RefObject } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

type Props = {
  /** When true, mount the in-phone camera video (same clip as slide bg). */
  playVideo: boolean;
  video: { webm: string; mp4: string; webm640?: string; mp4640?: string; poster: string };
  videoRef: RefObject<HTMLVideoElement | null>;
  reducedMotion: boolean;
};

export function MeasureScreen({ playVideo, video, videoRef, reducedMotion }: Props) {
  return (
    <>
      {playVideo && !reducedMotion ? (
        <video
          ref={videoRef}
          className={styles.pv}
          muted
          loop
          playsInline
          preload="metadata"
          poster={video.poster}
          aria-hidden
        >
          {video.webm640 ? (
            <source
              src={video.webm640}
              type="video/webm"
              media="(max-width:820px)"
            />
          ) : null}
          {video.mp4640 ? (
            <source
              src={video.mp4640}
              type="video/mp4"
              media="(max-width:820px)"
            />
          ) : null}
          <source src={video.webm} type="video/webm" />
          <source src={video.mp4} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.pv} src={video.poster} alt="" />
      )}
      <StatusBar />
      <div className={styles.hud}>
        <em>LiDAR</em>
        <em>4.2 m</em>
      </div>
      <div className={styles.scan} aria-hidden />
      <svg className={styles.ms} viewBox="0 0 390 844" aria-hidden>
        <g stroke="#fff" strokeWidth="2" fill="none">
          <path d="M96 330H292" />
          <path d="M96 318v24M292 318v24" />
          <path d="M326 250V560" />
          <path d="M314 250h24M314 560h24" />
        </g>
      </svg>
      <span className={styles.ml} style={{ left: 150, top: 292 }}>
        14′ 2″
      </span>
      <span
        className={styles.ml}
        style={{
          left: 336,
          top: 395,
          transform: "translateX(-100%) translateX(-12px)",
        }}
      >
        9′ 6″
      </span>
      <div className={styles.shut}>
        <span />
      </div>
      <div className={styles.savep}>Save measurement</div>
    </>
  );
}
