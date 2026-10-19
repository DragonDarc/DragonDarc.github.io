import { createRoot } from 'react-dom/client';
import RadarApp from './radar-app';
import { loadPublishedData } from '../lib/pages-data';
import './globals.css';
import './mrlcom-design.css';
import './cinematic.css';

async function start() {
  const root = createRoot(document.getElementById('root')!);
  try {
    root.render(<RadarApp initial={await loadPublishedData()} />);
  } catch {
    root.render(<main className="load-error"><h1>MRLCOM โรงเรียนมาเรียลัย</h1><p>โหลดรายการกิจกรรมไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง</p><button className="button primary" onClick={() => location.reload()}>ลองอีกครั้ง</button></main>);
  }
}
void start();
