//
//  DashboardDownloadItem.m
//  Dashboard
//
//  Copyright (c) 2010 Rich Hong
//  
//  Permission is hereby granted, free of charge, to any person
//  obtaining a copy of this software and associated documentation
//  files (the "Software"), to deal in the Software without
//  restriction, including without limitation the rights to use,
//  copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following
//  conditions:
//  
//  The above copyright notice and this permission notice shall be
//  included in all copies or substantial portions of the Software.
//  
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//  WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//  OTHER DEALINGS IN THE SOFTWARE.
//

#import "DashboardDownloadItem.h"

@implementation DashboardDownloadItem

@synthesize progressView, icon, label, request, data;

- (id)initWithFrame:(CGRect)frame request:(NSURLRequest *)aRequest delegate:(id<DashboardDownloadItemDelegate>)aDelegate{
    if ((self = [super initWithFrame:frame])) {
        // Initialization code
        self.request = aRequest;
        delegate = aDelegate;
        
        UIImage *image = [UIImage imageNamed:@"DashboardIcon.png"];
        CGRect buttonFrame = CGRectZero;
        buttonFrame.origin.x = 12.0;
        buttonFrame.origin.y = 12.0;
        buttonFrame.size.width = image.size.width;
        buttonFrame.size.height = image.size.height;
        
        self.icon = [UIButton buttonWithType:UIButtonTypeCustom];
        self.icon.frame = buttonFrame;
        [self.icon setImage:image forState:UIControlStateNormal];
        [self addSubview:self.icon];
        
        self.progressView = [[UIProgressView alloc] initWithProgressViewStyle:UIProgressViewStyleDefault];
        CGRect progressFrame = buttonFrame;
        progressFrame.origin.x += 10.0;
        progressFrame.origin.y += buttonFrame.size.height - 20.0;
        progressFrame.size.width -= 20.0;
        progressFrame.size.height = 10.0;
        self.progressView.frame = progressFrame;
        [self addSubview:self.progressView];
        
        
		self.label = [[[UILabel alloc] initWithFrame:CGRectMake(2.0, 102.0, 100.0, 14.0)] autorelease];
		self.label.text = @"Waiting...";
		self.label.backgroundColor = [UIColor clearColor];
		self.label.font = [UIFont boldSystemFontOfSize:12.0];
		self.label.textAlignment = UITextAlignmentCenter;
		self.label.textColor = [UIColor darkGrayColor];
		self.label.shadowColor = [UIColor whiteColor];
		self.label.shadowOffset = CGSizeMake(0, 1);
		[self addSubview:self.label];
    }
    return self;
}

- (void)start {
    // Start download
    self.data = [[NSMutableData alloc] initWithLength:0];
    NSURLConnection *connection = [NSURLConnection connectionWithRequest:request delegate:self];
    if (connection) {
        [UIApplication sharedApplication].networkActivityIndicatorVisible = YES;
    }else {
        [delegate downloadItem:self didFailWithError:[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorBadURL userInfo:nil]];
    }
}

- (void)dealloc {
    self.progressView = nil;
    self.icon = nil;
    self.label = nil;
    self.request = nil;
    self.data = nil;
    [super dealloc];
}

#pragma mark -
#pragma mark NSURLConnection delegate methods
- (void) connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    /* This method is called when the server has determined that it has
     enough information to create the NSURLResponse. It can be called
     multiple times, for example in the case of a redirect, so each time
     we reset the data. */
    [self.data setLength:0];
    length = [response expectedContentLength];
    self.progressView.progress = 0.0;
    self.label.text = @"Loading...";
    [UIApplication sharedApplication].networkActivityIndicatorVisible = YES;
}


- (void) connection:(NSURLConnection *)connection didReceiveData:(NSData *)aData {
    /* Append the new data to the received data. */
    [self.data appendData:aData];
    if (length != NSURLResponseUnknownLength) {
        self.progressView.progress = (double)[self.data length] / (double)length;
    }
    [UIApplication sharedApplication].networkActivityIndicatorVisible = YES;
}

- (void) connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    [UIApplication sharedApplication].networkActivityIndicatorVisible = NO;
    self.progressView.progress = 1.0;
    [delegate downloadItem:self didFailWithError:error];
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
    [UIApplication sharedApplication].networkActivityIndicatorVisible = NO;
    self.progressView.progress = 1.0;
    self.label.text = @"Installing...";
    [delegate downloadItem:self didFinishWithData:self.data];
}

@end
