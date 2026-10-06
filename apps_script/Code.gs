/**
 * '이상하고 아름다운 어중간' 콜라주 → 구글 드라이브 자동 저장 (Google Apps Script)
 *
 * 사이트(index.html)가 콜라주를 완성할 때마다 PNG를 이 웹 앱으로 보내고,
 * 이 스크립트가 작가의 드라이브 폴더에 파일로 저장합니다.
 *
 * 사이트에서 만든 콜라주만 받도록 다음을 모두 검사합니다.
 *   1) 토큰이 사이트와 같은지
 *   2) 진짜 PNG 파일인지
 *   3) 사이트가 만드는 크기(1500 × 2000)와 정확히 같은지
 *   4) 너무 큰 파일이 아닌지, 짧은 시간에 너무 많이 들어오지 않는지
 * 저장할 폴더가 휴지통에 있으면 저장하지 않습니다.
 *
 * 설정 방법은 같은 폴더의 '설정방법.txt' 를 보세요.
 */

const FOLDER_ID = '여기에_드라이브_폴더_ID';     // 드라이브 폴더 주소 맨 끝의 긴 문자열
const TOKEN = 'h0mkuqeyibw6f379to5sjncz';          // index.html 의 DRIVE_UPLOAD_TOKEN 과 같아야 함

const EXPECTED_W = 1500;
const EXPECTED_H = 2000;
const MAX_BYTES = 15 * 1024 * 1024;   // 15MB
const MAX_PER_10MIN = 60;             // 10분에 최대 60장

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.token !== TOKEN) return reply('denied');

    const bytes = Utilities.base64Decode(data.image);
    if (bytes.length > MAX_BYTES) return reply('too_large');
    if (!isSitePng(bytes)) return reply('not_site_image');
    if (!underRateLimit()) return reply('too_many');

    const name = '도깨비_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmmss') +
                 '_' + Math.random().toString(36).slice(2, 6) + '.png';
    const folder = DriveApp.getFolderById(FOLDER_ID);
    if (folder.isTrashed()) return reply('folder_trashed');   // 폴더를 휴지통에 넣으면 바로 저장 중단
    folder.createFile(Utilities.newBlob(bytes, 'image/png', name));
    return reply('ok');
  } catch (err) {
    return reply('error');
  }
}

/* PNG 서명 + IHDR 의 가로·세로가 사이트 출력 크기와 같은지 확인 */
function isSitePng(b) {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  if (b.length < 24) return false;
  for (let i = 0; i < 8; i++) if ((b[i] & 0xff) !== SIG[i]) return false;
  const u32 = i => ((b[i] & 0xff) << 24 | (b[i + 1] & 0xff) << 16 | (b[i + 2] & 0xff) << 8 | (b[i + 3] & 0xff)) >>> 0;
  return u32(16) === EXPECTED_W && u32(20) === EXPECTED_H;
}

/* 10분 동안 들어온 개수를 세서 너무 많으면 거절 */
function underRateLimit() {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('count') || 0);
  if (n >= MAX_PER_10MIN) return false;
  cache.put('count', String(n + 1), 600);
  return true;
}

function reply(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}

/* 설정 확인용: Apps Script 편집기에서 이 함수를 한 번 실행하면 드라이브 권한을 승인하고 폴더 접근을 확인함 */
function testFolder() {
  Logger.log('폴더 이름: ' + DriveApp.getFolderById(FOLDER_ID).getName());
}
