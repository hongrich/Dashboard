//
//  DashboardDownloadItem.h
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

#import <UIKit/UIKit.h>

@protocol DashboardDownloadItemDelegate;

@interface DashboardDownloadItem : UIView {
    UIProgressView *progressView;
	UILabel *label;
    UIButton *icon;
    
    id<DashboardDownloadItemDelegate> delegate;
    NSURLRequest *request;
    NSMutableData *data;
    long long length;
}

@property (nonatomic, retain) UIProgressView *progressView;
@property (nonatomic, retain) UILabel *label;
@property (nonatomic, retain) UIButton *icon;

@property (nonatomic, retain) NSURLRequest *request;
@property (nonatomic, retain) NSMutableData *data;

- (id)initWithFrame:(CGRect)frame request:(NSURLRequest *)request delegate:(id<DashboardDownloadItemDelegate>)delegate;
- (void)start;

@end

@protocol DashboardDownloadItemDelegate <NSObject>

- (void)downloadItem:(DashboardDownloadItem *)downloadItem didFailWithError:(NSError *)error;
- (void)downloadItem:(DashboardDownloadItem *)downloadItem didFinishWithData:(NSData *)data;

@end