export default function waitForResponse(page, urlPattern) {
  return new Promise(resolve => {
    page.on('response', function callback(response) {
      const respUrl = response.url();
      if (respUrl.match(urlPattern)) {
        resolve(response);
        page.removeListener('response', callback);
      }
    });
  });
}