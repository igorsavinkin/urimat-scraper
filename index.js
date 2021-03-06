const Apify = require('apify');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const marker = Math.random().toString().substring(2, 5);
const stripUnescape = require("./strip_unescape");


const csvWriter = createCsvWriter({
  path: 'out-' + marker + '.csv',
  fieldDelimiter : ';',
  header: [
    {id: 'name', title: 'Name'},
	{id: 'url', title: 'Web Link'},
	{id: 'sku', title: 'Artikel'}, 
	{id: 'short_descr', title: 'Kurz beschreibung'},
	{id: 'description', title: 'Beschreibung'}, 
    {id: 'price', title: 'Preise'},
	{id: 'info', title: 'Preise Info'},
    {id: 'delivery_time', title: 'Lieferzeit'},	
	{id: 'images', title: 'Bilder'},
	
  ]
});
var total_data =[];
var product_counter = 0;
var category_counter = 0; 
var processed_counter = 0;
var category_processed_counter = 0;
var kat_count={};
var kat_count2={};
var shop_link = 1;
var all_links=[]; 

const { log } = Apify.utils;
log.setLevel(log.LEVELS.DEBUG);

const queue_name ='urimat-'+marker;
const base_url = '';
const base_url_image = 'https://www.urimat.shop/';

Apify.main(async () => { 
    // Add URLs to a RequestQueue
	const requestQueue = await Apify.openRequestQueue(queue_name);
	 var categories=[]; 
	const lineReader = require('line-reader');
	lineReader.eachLine('categories.txt', async function(line) { 
		let url = base_url + line.trim(); 
		await requestQueue.addRequest({ url: url });
		categories.push(url);
	});
	
	// await requestQueue.addRequest({ url:'https://www.urimat.shop/zubehoer/Testkategorie-34/green-drain-geruchssperre-fuer-bodenablaeufe-82.html'}); 

	/* var { totalRequestCount, handledRequestCount, pendingRequestCount, name } = await requestQueue.getInfo();
	console.log(`RequestQueue "${name}" with requests:` );
	console.log(' handledRequestCount:', handledRequestCount);
	console.log(' pendingRequestCount:', pendingRequestCount);
	console.log(' totalRequestCount:'  , totalRequestCount);	*/
	//process.exit(); 
	
    // Create an instance of the CheerioCrawler class - a crawler
    // that automatically loads the URLs and parses their HTML using the cheerio library.
    const crawler = new Apify.CheerioCrawler({
        // Let the crawler fetch URLs from our list.
        requestQueue,
 
        minConcurrency: 10,
        maxConcurrency: 50,

        // On error, retry each page at most once.
        maxRequestRetries: 2,

        // Increase the timeout for processing of each page.
        handlePageTimeoutSecs: 50,

        // Limit to 10 requests per one crawl
        maxRequestsPerCrawl: 600000,
		
        handlePageFunction: async ({ request, $ }) => { 
			console.log ('loaded: ' + parseInt( $.root().html().length /10e3 ) + "KB.");
			
			if ( !categories.includes(request.url)  ){// product page or category page ?
				// product page process 
				//log.debug(`Processing product page ${request.url}...`);
				processed_counter +=1;
				
				// get image links  
				var images = []; 				 
				$('div#product_image_swiper a').each((index, el) => { 
					images.push( base_url_image + $(el).attr('href')  );  
				});	
				let delivery_time='';
			 	try{
					delivery_time = $('span.products-shipping-time-value').text().split('(')[1].split(')')[0];
				} catch(e){ 
					console.log("No delivery time for url: ",  request.url);
				} 							
							
				let item = {
					url: stripUnescape.unescape_html( request.url )
					, images: images
					, name:   $('h1').text().trim() //
					, sku:    $('form dd.model-number').text().trim() //
					, price:  $('div.current-price-container').text().trim().replace(/(\t|\n)/gm," ") //
					, info:  $('p.tax-shipping-text').text().trim() //
					, delivery_time: delivery_time  //
					, short_descr: $('div.product-info-title-mobile').text().replace(/(\t|\n)/gm,"") 	//
					, description: stripUnescape.unescape_html( stripUnescape.strip_all ( $('div[itemprop=description]').html().replace(/(\r\n|\n|\r)/gm,"") ) ).trim()  //
				}; 
				total_data.push(item);  
				
			} else {
				// category page				
				//log.debug(`Processing category page ${request.url}`);
				category_processed_counter +=1; 
				let category_counter=0;
				
				// pagination links 
				let total=0;
				try {
					total= $('div.pagination-info').text().split('insgesamt')[1].split('Artikeln')[0].trim();
				} catch(e){ }
				/* if ( !request.url.includes('?p=')){
					$('ul.pagination > li > a').each((index, el) => { 
						let url = $(el).attr('href').trim(); 
						requestQueue.addRequest({ url: base_url + url });
						console.log('pagination link: ', url)
					});	
				} */
				
				// product links
				$('div.title a').each((index, el) => { 
				    let url = $(el).attr('href').trim(); 
					requestQueue.addRequest({ url: base_url + url });
					product_counter +=1; 
					category_counter +=1;
				});					
				kat_count[ request.url.split('https://www.urimat.shop/')[1] /* .replace('/','-') */  ] = category_counter;
				kat_count2[ request.url.split('https://www.urimat.shop/')[1] /* .replace('/','-') */  ] = parseInt(total);
				 
			} 
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            log.debug(`Request ${request.url} failed twice.`);
        },
    });

    // Run the crawler and wait for it to finish.
    await crawler.run();

    log.debug('Crawler finished.');  
	
	log.debug('------------------- Gathered --------------------------');
	log.debug('Total product links got from site: ' + product_counter); 
	log.debug('Items by categories: '); //, [...kat_count.keys()].join('='));
    log.debug( JSON.stringify( kat_count, null, 2));      
	category_counter = 0;
	for (const [key, value] of Object.entries(kat_count)) {
	    // console.log(`${key}: ${value}`);
		category_counter += parseInt(value); 
	}
	
	log.debug('Total elements in all categories: ' + category_counter); 
	log.debug('------------------- Navigation --------------------------');
	category_counter = 0; 
	for (const [key, value] of Object.entries(kat_count2)) {
	    // console.log(`${key}: ${value}`);
		category_counter += parseInt(value); 
	}
    log.debug('Total product links from pagination info:' + category_counter); 
    // log.debug('Total pagination links got from site: ' + pagination_counter); 
	
	log.debug('---------------------- Processed -----------------------');
    log.debug('Total products links processed: ' + processed_counter);  
    //log.debug('Total shop links processed: ' + shop_link);  
	//all_links = [...new Set(all_links)];
    //log.debug('All links unique length: ' + all_links.length);  
    log.debug('Total category links processed: ' + category_processed_counter);  
	console.log('total_data length:', total_data.length);
	//console.log('total_data:', total_data);
	try { 
		console.log(total_data[0]);  
	} catch (err) { 
		log.error(err);
	} 
	if (total_data) {
		await csvWriter.writeRecords(total_data)
		  .then(()=> console.log('The CSV file was written successfully'))
		  .catch( (error) => console.log(error)); 
	} else {
		log.debug("No data at this run.");
	}
});	

