// Firefox only returns promises on the `browser` namespace; Chrome only defines `chrome`
const ext = globalThis.browser ?? globalThis.chrome;

ext.action.onClicked.addListener(async (tab) => {
  try {
    // Extract article content from current tab
    await ext.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['readability.js']
    });

    const results = await ext.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          const docClone = document.cloneNode(true);
          const article = new Readability(docClone).parse();
          
          return {
            title: article?.title || document.title || 'Untitled',
            content: article?.content || '',
            textContent: article?.textContent || '',
            excerpt: article?.excerpt || '',
            byline: article?.byline || '',
            url: window.location.href,
            success: !!article
          };
        } catch (error) {
          console.error('Readability extraction failed:', error);
          return {
            title: document.title || 'Untitled',
            content: '',
            textContent: '',
            excerpt: '',
            byline: '',
            url: window.location.href,
            success: false,
            error: error.message
          };
        }
      }
    });

    const articleData = results[0].result;
    
    // Store article data temporarily
    await ext.storage.local.set({ 
      currentArticle: articleData,
      extractedAt: Date.now()
    });

    // Open reader page
    ext.tabs.create({
      url: ext.runtime.getURL('reader.html')
    });

  } catch (error) {
    console.error('Failed to extract article:', error);
    
    // Still open reader page, it can show the error
    await ext.storage.local.set({ 
      currentArticle: {
        title: 'Error',
        content: '',
        url: tab.url,
        success: false,
        error: 'Failed to extract article content'
      },
      extractedAt: Date.now()
    });

    ext.tabs.create({
      url: ext.runtime.getURL('reader.html')
    });
  }
});