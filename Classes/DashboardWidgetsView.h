//
//  DashboardWidgetsView.h
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
#import "DashboardWidgetItem.h"
#import "ZipArchive.h"
#import "DashboardAppDelegate.h"
#import "DashboardDownloadItem.h"
#import "DashboardWidget.h"
#import "DashboardGadget.h"

@protocol DashboardWidgetsViewDelegate;

@interface DashboardWidgetsView : UIView<UIAlertViewDelegate, DashboardDownloadItemDelegate> {
    NSMutableArray *items;
    NSMutableArray *paths;
    
	UIImageView *backgroundView;
	UIScrollView *scrollView;
    
    BOOL editing;
    
    DashboardDownloadItem *tempDownloadItem;
    DashboardWidgetItem *dragItem;
    NSInteger positionOrigin;
    BOOL didMove;
    BOOL firstEdit;
    
    id<DashboardWidgetsViewDelegate> delegate;
}

#define ICON_WIDTH 104.0
#define PLACEHOLDER @"DOWNLOADING..."

@property (nonatomic, retain) NSMutableArray *items;
@property (nonatomic, retain) NSMutableArray *paths;
@property (nonatomic, retain) UIImageView *backgroundView;
@property (nonatomic, retain) UIScrollView *scrollView;
@property (nonatomic) BOOL editing;

+ (void)replacePathOfType:(NSString*)type inDirectory:(NSString*)dir;

- (id)initWithFrame:(CGRect)frame delegate:(id<DashboardWidgetsViewDelegate>)aDelegate;

- (void)reloadWidgets;

- (void)showScrollView:(BOOL)animated;
- (void)hideScrollView:(BOOL)animated;

- (void)beginEditing;
- (void)endEditing;

- (DashboardWidgetItem *)addIcon:path withFrame:(CGRect)frame;
- (void)removeIcon:(id)item;

- (void)swapItemFrom:(NSInteger)i to:(NSInteger)j;
- (void)replaceItem:(DashboardDownloadItem*)downloadItem withItem:(NSString*)path;
- (void)addItem:(NSURLRequest *)request;
- (void)removeItem:(id)sender;

- (void)handleGadgetDownloadItem:(NSArray*)args;
- (void)handleWidgetDownloadItem:(DashboardDownloadItem *)downloadItem data:(NSData *)data;

@end

@protocol DashboardWidgetsViewDelegate <NSObject>

- (void)widgetDidAdd:(NSString *)path;
- (void)itemDidRemove:(NSString *)bundleIdentifier;

@end
