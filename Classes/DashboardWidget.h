//
//  DashboardWebView.h
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
#import "DashboardAppDelegate.h"

@interface DashboardWidget : UIView <UIWebViewDelegate,UIGestureRecognizerDelegate> {
    UIImageView *imageView;
    UIWebView *webView;
    UIButton *closeButton;
    NSString *path;
    NSInteger closeX;
    NSInteger closeY;
    CGPoint prevLoc;
    NSString *bundleIdentifier;
    NSString *js_identifier;
    NSInteger positionX;
    NSInteger positionY;

    id js_calculator;

    id js_ondragstart;
    id js_ondragend;
    id js_onremove;
    id js_onhide;
    id js_onshow;
    id js_ontransitioncomplete;

    // TODO
    id js_onreceiverequest;
}

- (void)initialize;
- (id)initWithFrame:(CGRect)frame path:(NSString*)path identifier:(NSString*)identifier;

- (void)closeWidget;
- (void)handleDrag:(UIGestureRecognizer *)sender;
- (void)handleSwipe:(UIGestureRecognizer *)sender;

- (void)resizeAndMoveToOnMainThread:(NSArray *)args;

# pragma -
# pragma property
@property (nonatomic, retain) UIImageView *imageView;
@property (nonatomic, retain) UIWebView *webView;
@property (nonatomic, retain) UIButton *closeButton;
@property (nonatomic, retain) NSString *path;
@property (nonatomic) NSInteger closeX;
@property (nonatomic) NSInteger closeY;
@property (nonatomic) CGPoint prevLoc;
@property (nonatomic, retain) NSString *bundleIdentifier;
@property (nonatomic, retain) NSString *js_identifier;
@property (nonatomic) NSInteger positionX;
@property (nonatomic) NSInteger positionY;

@end
