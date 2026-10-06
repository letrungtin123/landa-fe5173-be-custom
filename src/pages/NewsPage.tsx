import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Newspaper, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { getNewsFeed, getNewsPost } from '@/api/news';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toIntlLocale } from '@/i18n';
import { useLocaleStore } from '@/stores/useLocaleStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { htmlImageDisplaySrc, storageUrl } from '@/utils/storageUrl';

function formatDate(value: string, locale: 'vi' | 'en'): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: 'long' }).format(new Date(value));
}

function renderNewsHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
  if (!sanitized || typeof DOMParser === 'undefined') return sanitized;
  try {
    const doc = new DOMParser().parseFromString(sanitized, 'text/html');
    doc.querySelectorAll('img').forEach((image) => {
      image.setAttribute('src', htmlImageDisplaySrc(image.getAttribute('src')));
      image.setAttribute('loading', 'lazy');
      image.setAttribute('role', 'button');
      image.setAttribute('tabindex', '0');
    });
    doc.querySelectorAll('a').forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
    return doc.body.innerHTML;
  } catch {
    return sanitized;
  }
}

function FeedSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
      <Skeleton className="aspect-[16/8] w-full rounded-none" />
      <div className="space-y-3 p-5 sm:p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
      <Skeleton className="aspect-[16/7] w-full rounded-none" />
      <div className="space-y-5 p-5 sm:p-8 lg:p-10">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function NewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();
  const locale = useLocaleStore((state) => state.locale);
  const tenantId = useAuthStore((state) => state.user?.tenantId || null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<string | undefined>>([undefined]);
  const [cursorScope, setCursorScope] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [postId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const paginationScope = `${tenantId || ''}:${search}:${pageSize}`;
  const effectivePageIndex = cursorScope === paginationScope ? pageIndex : 0;
  const currentPageCursor = cursorScope === paginationScope ? pageCursors[effectivePageIndex] : undefined;

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([undefined]);
    setCursorScope(paginationScope);
  }, [paginationScope]);

  const feedQuery = useQuery({
    queryKey: ['news-feed', tenantId, search, pageSize, currentPageCursor || null],
    queryFn: () => getNewsFeed({ cursor: currentPageCursor, limit: pageSize, search: search || undefined }),
    enabled: Boolean(tenantId) && !postId,
    staleTime: 60_000,
  });

  const detailQuery = useQuery({
    queryKey: ['news-detail', tenantId, postId],
    queryFn: () => getNewsPost(postId!),
    enabled: Boolean(tenantId && postId),
    staleTime: 60_000,
  });

  const posts = useMemo(() => feedQuery.data?.results || [], [feedQuery.data]);

  const goToNextPage = () => {
    const nextCursor = feedQuery.data?.next_cursor;
    if (!nextCursor) return;
    setPageCursors((current) => {
      const next = current.slice(0, effectivePageIndex + 1);
      next[effectivePageIndex + 1] = nextCursor;
      return next;
    });
    setPageIndex(effectivePageIndex + 1);
  };

  const paginationPageIndexes = useMemo(() => {
    const loadedPageCount = cursorScope === paginationScope ? pageCursors.length : 1;
    const knownPageCount = Math.max(
      loadedPageCount,
      effectivePageIndex + 1 + (feedQuery.data?.has_more ? 1 : 0),
    );
    return Array.from({ length: knownPageCount }, (_, index) => index)
      .filter((index) => index === 0 || index === knownPageCount - 1 || Math.abs(index - effectivePageIndex) <= 1);
  }, [cursorScope, effectivePageIndex, feedQuery.data?.has_more, pageCursors.length, paginationScope]);

  const articleHtml = useMemo(
    () => renderNewsHtml(detailQuery.data?.content_html || ''),
    [detailQuery.data?.content_html],
  );

  const handleArticleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const image = (event.target as HTMLElement | null)?.closest('img') as HTMLImageElement | null;
    if (!image || !event.currentTarget.contains(image)) return;
    event.preventDefault();
    setZoomedImage(image.currentSrc || image.src);
  }, []);

  if (postId) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/[0.045] via-background to-background">
        <section className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/news')}
            className="mb-5 -ml-2 rounded-xl text-muted-foreground transition-none hover:bg-transparent hover:text-muted-foreground sm:mb-7"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('news.backToNews')}
          </Button>

          {detailQuery.isLoading ? (
            <DetailSkeleton />
          ) : detailQuery.isError || !detailQuery.data ? (
            <div className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
              <Newspaper className="mb-4 h-10 w-10 text-destructive/60" />
              <p className="font-medium text-destructive">{t('news.detailLoadFailed')}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => detailQuery.refetch()}>{t('news.retry')}</Button>
                <Button onClick={() => navigate('/news')} className="transition-none hover:bg-primary">{t('news.backToNews')}</Button>
              </div>
            </div>
          ) : (
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm"
            >
              {detailQuery.data.preview_image_path && (
                <img
                  src={storageUrl(detailQuery.data.preview_image_path)}
                  alt=""
                  className="aspect-[16/8] w-full object-cover sm:aspect-[16/7]"
                />
              )}
              <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-11">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> {formatDate(detailQuery.data.created_at, locale)}
                </div>
                <h1 className="mt-3 break-words text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
                  {detailQuery.data.title}
                </h1>
                {detailQuery.data.excerpt && (
                  <p className="mt-5 border-l-2 border-primary/50 pl-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {detailQuery.data.excerpt}
                  </p>
                )}
                <div
                  className="news-article-content prose prose-sm prose-slate mt-8 max-w-none break-words dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/85 prose-a:text-primary prose-img:cursor-zoom-in prose-img:rounded-2xl prose-img:shadow-md sm:prose-base"
                  onClick={handleArticleClick}
                  dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
              </div>
            </motion.article>
          )}
        </section>

        <AnimatePresence>
          {zoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur"
              onClick={() => setZoomedImage(null)}
            >
              <button type="button" aria-label={t('news.closeImage')} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
              <motion.img initial={{ scale: 0.96 }} animate={{ scale: 1 }} src={zoomedImage} alt="" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/[0.045] via-background to-background">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('news.title')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{t('news.description')}</p>
          </motion.div>
          <div className="relative mt-7 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary/80" aria-hidden="true" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('news.searchPlaceholder')}
              className="h-12 w-full rounded-2xl border border-border/80 bg-background/90 pl-11 pr-11 text-sm shadow-sm outline-none backdrop-blur transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label={t('news.clearSearch')}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {feedQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <FeedSkeleton key={index} />)}
          </div>
        ) : feedQuery.isError ? (
          <div className="flex flex-col items-center rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
            <Newspaper className="mb-4 h-10 w-10 text-destructive/60" />
            <h2 className="font-semibold text-destructive">{t('news.loadFailed')}</h2>
            <Button variant="outline" onClick={() => feedQuery.refetch()} className="mt-4">{t('news.retry')}</Button>
          </div>
        ) : posts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Newspaper className="h-7 w-7" /></div>
            <h2 className="text-lg font-semibold">{t(search ? 'news.noResults' : 'news.emptyTitle')}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{t(search ? 'news.noResultsDescription' : 'news.emptyDescription')}</p>
          </motion.div>
        ) : (
          <>
            <motion.div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {posts.map((post, index) => (
                  <motion.button
                    type="button"
                    key={post.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.035 }}
                    onClick={() => navigate(`/news/${post.id}`)}
                    className="overflow-hidden rounded-3xl border border-border/70 bg-card text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[16/8] overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
                      {post.preview_image_path ? (
                        <img src={storageUrl(post.preview_image_path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><Newspaper className="h-11 w-11 text-primary/30" /></div>
                      )}
                    </div>
                    <div className="flex min-h-56 flex-col p-5 sm:p-6">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.created_at, locale)}
                      </div>
                      <h2 className="mt-3 line-clamp-2 text-xl font-semibold leading-snug text-foreground">{post.title}</h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt || t('news.noExcerpt')}</p>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-primary">
                        {t('news.readMore')} <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.button>
                ))}
            </motion.div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={effectivePageIndex === 0 || feedQuery.isFetching} onClick={() => setPageIndex(Math.max(0, effectivePageIndex - 1))} className="h-9 w-9 rounded-lg bg-card" aria-label={t('news.previous')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {paginationPageIndexes.map((index, position) => (
                  <span key={index} className="contents">
                    {position > 0 && paginationPageIndexes[position - 1] !== index - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                    <Button
                      variant={index === effectivePageIndex ? 'default' : 'outline'}
                      size="icon"
                      disabled={feedQuery.isFetching}
                      onClick={() => index === effectivePageIndex + 1 ? goToNextPage() : setPageIndex(index)}
                      className="h-9 w-9 rounded-lg text-sm"
                      aria-current={index === effectivePageIndex ? 'page' : undefined}
                    >
                      {index + 1}
                    </Button>
                  </span>
                ))}
                <Button variant="outline" size="icon" disabled={!feedQuery.data?.has_more || feedQuery.isFetching} onClick={goToNextPage} className="h-9 w-9 rounded-lg bg-card" aria-label={t('news.next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="mx-2 hidden h-8 w-px bg-border sm:block" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('news.show')}</span>
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-9 w-[70px] rounded-lg bg-card font-semibold text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-[70px] rounded-lg">
                    {[5, 10, 15, 20].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
