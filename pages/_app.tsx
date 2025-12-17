/**
 * Next.js App 组件
 * 全局样式和应用配置
 */

import type { AppProps } from 'next/app';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

