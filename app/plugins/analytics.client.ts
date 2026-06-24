export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const domain = config.public.plausibleDomain as string | undefined;

  if (!domain) {
    return;
  }

  useHead({
    script: [
      {
        src: 'https://plausible.io/js/script.js',
        defer: true,
        'data-domain': domain,
      },
    ],
  });
});
