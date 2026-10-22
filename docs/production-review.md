# BizFlow production incelemesi — 22 Ekim 2026

## Kapsam ve mimari

Tüm src route, controller, service, middleware, validator ve config dosyaları; server.js, package dosyaları, Prisma schema ve migration geçmişi incelendi. generated/prisma uygulama kodu olarak değiştirilmedi. Route → authentication/role/validation middleware → controller → service → Prisma MariaDB adapter → MySQL akışı korunuyor. JWT bir saat geçerli. OWNER/MANAGER yönetim uçlarını, TECHNICIAN atandığı servisleri kullanıyor.

Frontend, endpoint yolları ve Prisma schema/migration dosyaları değiştirilmedi. Başarı yanıtlarının mevcut sarmalayıcıları korundu. Güvenlik düzeltmesi olarak completion yanıtından passwordHash kaldırıldı. Geçersiz istekler daha erken reddediliyor; normal status endpointi COMPLETED kabul etmiyor, mevcut /:id/complete kullanılmalı. Atama yalnız OPEN/ASSIGNED için kabul ediliyor.

Bu klasörde .git bulunmadığından Git diff/önceki sürüm karşılaştırması yapılamadı.

## Critical

| Bulgu | Durum |
| --- | --- |
| PATCH customer body doğrudan Prisma'ya aktarılıyor; companyId ve nested relation değiştirme riski | Partial customer validator eklendi; tanımsız alanlar temizleniyor. |
| TECHNICIAN şirketin bütün servislerini listeleyebiliyor, ID ile başka teknisyenin servisine erişebiliyor | Liste atanan member ile filtreleniyor. ID route'larında şirket + assignment kontrolü, upload'dan önce çalışıyor. |
| Completion yalnız şirketi doğruluyor; başka teknisyenin servisini tamamlamak mümkün | Completion dahil tüm servis ID route'ları requestAccess kullanıyor. |
| Completion ilişkili User kayıtlarından passwordHash sızdırıyor | Kullanıcı ilişkileri güvenli alanlarla select ediliyor. |
| /uploads dosyaları kimlik doğrulamasız sunuluyor | **Düzeltildi:** Static sunum kaldırıldı. Eski /uploads yolu anonim isteğe 401, authenticated isteğe 404 verir. GET /attachments/:attachmentId/content Bearer doğrulaması, güncel rol/üyelik, company ve technician assignment scope ile dosyayı DB kaydından sunar. Frontend kartı mevcut API helper üzerinden Blob alır; preview ve açma aynı Object URL'yi kullanır, cleanup abort/revoke uygular. |

## Important

- **Düzeltildi:** JWT verify yalnız HS256 kabul ediyor, geçerli pozitif ID ve exp kontrol ediyor; güncel üyelik ve rol DB'den okunuyor. Eksik/geçersiz token 401, kaldırılmış üyelik 403. Bu her authenticated istekte bir üyelik sorgusu ekler.
- **Düzeltildi:** Normal status geçişi COMPLETED olamıyor. Completion yalnız IN_PROGRESS'ten, sunucu completedAt değeriyle çalışıyor. Status/completion/assignment update koşulları önceki status ve companyId içeriyor; eşzamanlı kayıp güncelleme P2025/409 ile reddediliyor.
- **Düzeltildi:** Atama terminal ve ilerlemiş servisleri ASSIGNED durumuna geri döndüremiyor; OPEN → ASSIGNED history aynı transaction'a yazılıyor. Duplicate assignment DB unique constraint ve 409 ile korunuyor. Farklı şirketten/TECHNICIAN olmayan member zaten reddediliyordu.
- **Düzeltildi:** Customer create/update/delete, service create, assignment, status, completion ve attachment create/delete ile audit aynı Prisma transaction'ında. HTTP başarı yanıtı commit sonrasında gönderiliyor. Audit mesajları VARCHAR(191) sınırına kısaltılıyor.
- **Düzeltildi:** Upload klasörü oluşturuluyor; 10 MB limit korunuyor, dosya/part sayıları sınırlanıyor. MIME'dan güvenli uzantı ve UUID üretiliyor, temel dosya imzası kontrol ediliyor. Bu tam dosya doğrulaması veya malware taraması değildir. DB/audit başarısızsa yeni fiziksel dosya temizleniyor. Dosya silme DB+audit commit sonrasında yapılıyor; unlink hatası kayda alınır, başarılı DB işlemi hata diye dönmez. Fiziksel silme başarısızlığı veya process crash için orphan reconciliation hâlâ gerekli; dosya sistemi ve DB atomik değildir.
- **Düzeltildi:** ID, pagination integer, search uzunluğu, enum ve query tip kontrolü eklendi. Mevcut 100 kayıt sayfa limiti korunuyor. slaHours scheduledAt olmadan reddediliyor. Completion not/ücret sınırları zaten vardı ve korundu.
- **Düzeltildi:** Hata yanıtının success/message biçimi korunarak beklenmeyen 500 mesajları gizlendi; Prisma unique/FK/missing/transaction/uzunluk hataları güvenli mesajlara çevriliyor. Malformed JSON 400, büyük body ve Multer hataları uygun 4xx döndürüyor. JSON parser'ın mevcut varsayılan 100 KB limiti korunuyor. JSON 404 eklendi.
- **Düzeltildi:** FRONTEND_URL yoksa CORS açık wildcard yerine kapalı. Production FRONTEND_URL ve en az 32 byte JWT_SECRET gerektiriyor. TRUST_PROXY_HOPS açıkça yapılandırılabiliyor; altyapının güvenilir proxy sayısı kullanılmalı. Production DB bağlantısı DATABASE_URL gerektiriyor; geliştirmede eski localhost varsayımları korunuyor.
- **Düzeltildi:** Eski nodemon production dependencies'den devDependencies'e taşındı; lockfile güncellendi. Paket sürümleri değiştirilmedi. npm audit fix/--force çalıştırılmadı.
- **Açık:** Prisma varsayılan String kolonları MySQL VARCHAR(191), fakat description validator 1000, address validator 240 karakter kabul ediyor. Bu aralıkta istekler P2000/400 alabilir. Sözleşmeyi daraltmak yerine description için Text, address için daha uzun VARCHAR düşünülebilir. Önce gerçek DB şeması ve migration durumu kontrol edilmeli. Migration oluşturulmadı/uygulanmadı.
- **Açık:** scheduledAt geçmiş tarih kabul ediyor. Geçmiş servis girişi iş kuralı bilinmediğinden otomatik yasaklanmadı. serviceFee Decimal JSON davranışı korunuyor; null/boş ücretin mevcut coercion davranışı değiştirilmedi.
- **Açık:** Slug aynı companyName için çakışabilir; unique ihlali artık güvenli 409. Otomatik slug suffix davranışı eklenmedi.
- **Açık:** Rate limiter process belleğinde; çok instance için shared store gerekir. Yeni authenticated attachment content route API limiter kapsamındadır.
- **Açık:** Local uploads kalıcı volume ve yedek ister; çok instance için paylaşımlı/object storage gerekir. DATABASE_URL yalnız host/port/user/password/database olarak okunur; query string içindeki TLS seçenekleri adapter'a aktarılmaz. Uzak DB için TLS/CA kurulumu altyapıyla doğrulanmalı.

## Cleanup / ertelenen işler

Dashboard şirket scope içeriyor; sorgular toplu Promise.all ile, liste sayfalaması transaction ile çalışıyor. Bariz request başına N+1 döngüsü bulunmadı. Dashboard performansı, member/customer detayları ve /my atama listesi büyük veri setinde sınırsız kayıt çekebilir; profil ölçümü olmadan response/pagination değiştirilmedi. Birden çok teknisyene atanmış servis gelirinin teknisyen performansında tekrar sayılması iş kuralı olarak incelenmeli. Gün sınırları sunucu timezone'una bağlı; deployment TZ açık seçilmeli.

Customer servis geçmişi varsa silinemiyor; FK RESTRICT de mevcut. Mevcut indexler ve silme ilişkileri korunuyor. Swagger iskeleti route annotation içermediği için tam sözleşme belgesi değil; mevcut /api-docs yolu korundu. Graceful shutdown, merkezi log/metric, health/readiness endpointleri ve Node sürümü sabitlemesi deployment bağlamıyla ayrıca yapılmalı.

## Doğrulama ve sınırlar

- npm test: 11/11 güvenlik regresyon testi geçti. Prisma çağrıları test doubles kullanıyor; gerçek DB rollback/isolation testi değildir.
- 42 uygulama JS dosyası için node --check geçti; uygulama import edilebildi.
- Gerçek localhost HTTP listener açıldı: /auth/me, /customers, /members, /service-requests, /dashboard/summary tokensız 401; bilinmeyen yol 404.
- npm audit ilk taraması: 14 bulgu (9 high, 5 moderate), tamamı eski nodemon bağımlılık ağacında. Geliştirme ağacının sürümleri henüz güncellenmedi. Production için npm ci --omit=dev kullanılmalı.
- Son npm audit --omit=dev taraması: production bağımlılıklarında 0 bilinen açık.
- Gerçek MySQL/MariaDB üzerinde authenticated CRUD, eşzamanlı mutation, migration ve frontend uçtan uca testleri çalıştırılmadı. Production verisine bağlanılmadı, migration uygulanmadı, secret üretilmedi.

Public attachment açığı kapatıldı. Production öncesinde izole staging DB'de iki şirket/iki teknisyen ile olumlu ve olumsuz uçtan uca akışlar doğrulanmalı. Bu rapor production onayı değildir.


## Public attachment düzeltmesi sonrası doğrulama

- Yeni endpoint: `GET /attachments/:attachmentId/content`. Upload/listeleme/delete response shape ve DB filePath alanları değişmedi. filePath artık public erişim adresi değildir; mevcut frontend yalnız attachment ID üzerinden yetkili bytes isteği yapar.
- Backend: `src/app.js`, `src/routes/attachment.routes.js`, `src/controllers/attachment.controller.js`, `src/services/attachment.service.js`.
- Frontend (kardeş proje): `src/services/api.js`, `src/pages/ServiceRequestDetail.jsx`.
- Content query doğrudan attachment → request.companyId ve TECHNICIAN için request.assignments.some.memberId koşulları içerir. OWNER/MANAGER/TECHNICIAN dışındaki roller reddedilir. DB filename dışında URL/body yolu kullanılmaz; basename, realpath, root sınırı ve normal dosya kontrolleri traversal/symlink kaçışını reddeder. MIME allowlist, inline disposition, nosniff ve private/no-store uygulanır.
- `npm test`: 20/20 geçti (11 önceki test, HTTP test grubu ve 8 alt senaryo). Gerçek router, JWT, HTTP, Multer ve geçici fiziksel dosyalar; Prisma test doubles. Anonim/yabancı tenant/atanmamış teknisyen reddi; yetkili OWNER/MANAGER/TECHNICIAN görsel bytes; inline PDF MIME/bytes; DB/fiziksel dosya yokluğu; traversal/symlink; upload/list/view/delete doğrulandı.
- Frontend `npm run build -- --outDir /private/tmp/bizflow-attachment-build` geçti. Build çıktısı geçici dizine alındı.
- Tarayıcı kontrolü denendi; ortamda kullanılabilir tarayıcı bulunmadığından image decode, PDF viewer ve Object URL cleanup tarayıcıda doğrulanamadı. Build ve HTTP bytes doğrulaması tarayıcı uçtan uca testi yerine geçmez. Gerçek preview/açma için staging smoke testi gerekir.
- Schema, migration, storage, signed URL veya cookie auth değişikliği yoktur. Deploy sırasında frontend/backend birlikte güncellenmeli; eski frontend public filePath URL'leriyle çalışmaz. Reverse proxy/hosting de /uploads dizinini ayrıca public sunmamalıdır.
