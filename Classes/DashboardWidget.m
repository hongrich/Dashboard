//
//  DashboardWebView.m
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

#import "DashboardWidget.h"

static const CGFloat kSpringLoadFraction = 0.18;
static const NSTimeInterval kSpringLoadTimeInterval = 0.5;

@implementation DashboardWidget

@synthesize imageView;
@synthesize webView;
@synthesize closeButton;
@synthesize path;
@synthesize closeX;
@synthesize closeY;
@synthesize prevLoc;
@synthesize bundleIdentifier;
@synthesize js_identifier;
@synthesize positionX;
@synthesize positionY;

#pragma mark -
#pragma mark UIGestureRecognizerDelegate Methods
-(BOOL)gestureRecognizer:(UIGestureRecognizer*)gestureRecognizer shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer*)otherGestureRecognizer {
    return YES;
}

// Both initWithFrame and initWithCoder have some common code, however, initWithFrame always has widgetsView open while initWithCoder never does.
- (void)initialize {
    for (UIView *view in [self subviews]) {
        // TODO: might be able to just set them as imageView and closeButton instead of removing them
        if ([view isKindOfClass:[UIButton class]] || [view isKindOfClass:[UIImageView class]]) {
            // There is already a button or image!?! Remove these
            [view removeFromSuperview];
        }
    }

    // Show default image first
    UIImage *image = [UIImage imageWithContentsOfFile:[NSBundle pathForResource:@"Default" ofType:@"png" inDirectory:self.path]];
    self.imageView = [[UIImageView alloc] initWithImage:image];
    self.imageView.frame = CGRectMake(0, 0, self.frame.size.width, self.frame.size.height);
    [self addSubview:self.imageView];

    self.webView.delegate = self;
    self.webView.opaque = NO;
    self.webView.backgroundColor = [UIColor clearColor];
    
    // Stop bouncing
    UIScrollView *scrollView = [self.webView.subviews objectAtIndex:0];
    if ([scrollView respondsToSelector:@selector(setBounces:)]) {
        scrollView.bounces = NO;
        scrollView.scrollEnabled = NO;
    }
    
    // Get windowScriptObject (PRIVATE API)
    //id win = [[[self.webView _browserView] webView] windowScriptObject];
    id win = [[[self.webView performSelector:@selector(_browserView)] performSelector:@selector(webView)] performSelector:@selector(windowScriptObject)];
    [win setValue:self forKey:@"widget"];
    
    // Load widget's Info.plist file
    NSBundle *widgetBundle = [NSBundle bundleWithPath:self.path];
    NSString *mainHtml = [widgetBundle objectForInfoDictionaryKey:@"MainHTML"];
    // Actually load the widget
    NSURLRequest *URLReq = [NSURLRequest requestWithURL:[NSURL fileURLWithPath:[self.path stringByAppendingPathComponent:mainHtml]]];
    [self.webView loadRequest:URLReq];
    
    // Set window.alert = widget.alert
    [self.webView stringByEvaluatingJavaScriptFromString:@"window.alert = function (s) {widget.alert(s);};"];
    // Set window.screenX and window.screenY
    [self.webView stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"window.screenX = %f;", self.frame.origin.x + self.positionX]];
    [self.webView stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"window.screenY = %f;", self.frame.origin.y + self.positionY]];
    
    // Long press gesture ("touch and hold")
    UILongPressGestureRecognizer *dragGesture = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleDrag:)];
    [dragGesture setDelegate:self];
    [self addGestureRecognizer:dragGesture];
    [dragGesture release];
    
    // Swipe gesture for flipping widget
    // Actived by two finger swipe in either up or down direction
    UISwipeGestureRecognizer *swipeGesture = [[UISwipeGestureRecognizer alloc] initWithTarget:self action:@selector(handleSwipe:)];
    swipeGesture.numberOfTouchesRequired = 2;
    swipeGesture.direction = UISwipeGestureRecognizerDirectionDown | UISwipeGestureRecognizerDirectionUp;
    [swipeGesture setDelegate:self];
    [self addGestureRecognizer:swipeGesture];
    [swipeGesture release];

    // Add close button
    UIImage *closeImage = [UIImage imageNamed:@"DashboardClose.png"];
    self.closeButton = [UIButton buttonWithType:UIButtonTypeCustom];
    self.closeButton.frame = CGRectMake(self.closeX - 15, self.closeY - 15, 30, 30);
    [self.closeButton setImage:closeImage forState:UIControlStateNormal];
    [self.closeButton addTarget:self action:@selector(closeWidget) forControlEvents:UIControlEventTouchUpInside];
    [self addSubview:self.closeButton];

    js_directory_url = [[NSUserDefaults standardUserDefaults] stringForKey:@"preference_directory_url"];
    js_directory_username = [[NSUserDefaults standardUserDefaults] stringForKey:@"preference_directory_username"];
    js_directory_password = [[NSUserDefaults standardUserDefaults] stringForKey:@"preference_directory_password"];
}

- (id)initWithFrame:(CGRect)frame path:(NSString*)aPath identifier:(NSString*)aIdentifier{
    if (self = [super initWithFrame:frame]) {
        self.path = aPath;
        self.js_identifier = aIdentifier;
        self.positionX = 0;
        self.positionY = 0;
        
        // Load widget's Info.plist file
        
        NSBundle *widgetBundle = [NSBundle bundleWithPath:self.path];
        self.closeX = [[widgetBundle objectForInfoDictionaryKey:@"CloseBoxInsetX"] intValue];
        self.closeY = [[widgetBundle objectForInfoDictionaryKey:@"CloseBoxInsetY"] intValue];
        self.bundleIdentifier = [widgetBundle bundleIdentifier];
        
        // Create a new webView
        self.webView = [[UIWebView alloc] initWithFrame:CGRectMake(0, 0, frame.size.width, frame.size.height)];
        [self addSubview:self.webView];

        [self initialize];
        
        self.closeButton.hidden = NO;
        
        /*
        // Add the view and ripple
        [UIView beginAnimations:@"ripple" context:NULL];
        [UIView setAnimationDuration:1.5];
        [UIView setAnimationDelegate:self];
        [UIView setAnimationTransition:110 forView:self cache:NO];
        [imageView removeFromSuperview];
        //[self addSubview:self.webView];
        [UIView commitAnimations];
        [imageView release];
        */
    }
    return self;
}

- (void)dealloc {
    // Application is quitting therefore widgets are hiding
    [self.webView stringByEvaluatingJavaScriptFromString:@"widget.onhide();"];
    
    self.imageView = nil;
    self.webView.delegate = nil;
    self.webView = nil;
    self.closeButton = nil;
    self.path = nil;
    self.bundleIdentifier = nil;
    self.js_identifier = nil;

    [_springLoadTimer invalidate];
    _springLoadTimer = nil;
    [super dealloc];
}

-(void)layoutSubviews {
    CGRect aFrame = self.frame;
    /*
    if (aFrame.origin.x < 0.0) {
        aFrame.origin.x = 0.0;
    }else if (aFrame.origin.x + aFrame.size.width > [self superview].frame.size.width) {
        aFrame.origin.x = [self superview].frame.size.width - aFrame.size.width;
    }
    */
    if (aFrame.origin.y < 0.0) {
        aFrame.origin.y = 0.0;
    }else if (aFrame.origin.y + aFrame.size.height > [self superview].frame.size.height) {
        aFrame.origin.y = [self superview].frame.size.height - aFrame.size.height;
    }
    self.frame = aFrame;
}

# pragma -
# pragma Dragging

-(UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {	
	NSSet *touches = [event allTouches];
	BOOL forwardToSuper = YES;
	for (UITouch *touch in touches) {
		if ([touch tapCount] >= 2) {
			// prevent this 
			forwardToSuper = NO;
		}		
	}
	if (forwardToSuper){
		//return self.superview;
		return [super hitTest:point withEvent:event];
	}
	else {
		// Return the superview as the hit and prevent
		// UIWebView receiving double or more taps
		return self.superview;
	}
}

- (void)springLoadTimer:(NSTimer*)timer {
    _springLoadTimer = nil;
    UIScrollView *_scrollView = (UIScrollView*)(self.superview);

    if ([(NSNumber*)timer.userInfo boolValue]) { // Previous page
        CGFloat newX = _scrollView.contentOffset.x - _scrollView.frame.size.width;
        if (newX >= 0) {
            CGPoint offset = CGPointMake(newX, 0);
            CGPoint newCenter = CGPointMake(self.center.x - _scrollView.frame.size.width, self.center.y);

            _springing = YES;

            [UIView beginAnimations:nil context:NULL];
            [UIView setAnimationDelegate:self];
            [UIView setAnimationDidStopSelector:@selector(springingDidStop)];
            self.center = newCenter;
            [_scrollView setContentOffset:offset animated:NO];
            [UIView commitAnimations];
        }
    } else { // Next page
        CGFloat newX = _scrollView.contentOffset.x + _scrollView.frame.size.width;
        if (newX <= _scrollView.contentSize.width - _scrollView.frame.size.width) {
            CGPoint offset = CGPointMake(newX, 0);
            CGPoint newCenter = CGPointMake(self.center.x + _scrollView.frame.size.width, self.center.y);

            _springing = YES;

            [UIView beginAnimations:nil context:NULL];
            [UIView setAnimationDelegate:self];
            [UIView setAnimationDidStopSelector:@selector(springingDidStop)];
            self.center = newCenter;
            [_scrollView setContentOffset:offset animated:NO];
            [UIView commitAnimations];
        }
    }
}

- (void)springingDidStop {
    _springing = NO;
}

- (void)handleDrag:(UIGestureRecognizer *)sender {
    CGPoint loc = [sender locationInView:self.superview.superview];
    CGRect aFrame;
    float deltaX, deltaY;
    
    CGFloat springLoadDistance;
    BOOL goToPreviousPage, goToNextPage;
    CGPoint c = [self.superview convertPoint:self.center toView:self.superview.superview];

    // Do not moving widget during springing animation
    if (_springing) return;

    switch (sender.state) {
        case UIGestureRecognizerStateBegan:
            self.prevLoc = loc;
            [self.superview bringSubviewToFront:self];
            self.alpha = 0.7;
            [self.webView stringByEvaluatingJavaScriptFromString:@"widget.ondragstart();"];

            [_springLoadTimer invalidate];
            _springLoadTimer = nil;

            break;
        case UIGestureRecognizerStateChanged:
            // Start timer for going to a different page if widget is dragged to the edge
            springLoadDistance = self.frame.size.width * kSpringLoadFraction;
            goToPreviousPage = c.x - springLoadDistance < 0;
            goToNextPage = ((self.superview.frame.size.width - c.x) - springLoadDistance) < 0;
            if (goToPreviousPage || goToNextPage) {
                if (!_springLoadTimer) {
                    _springLoadTimer = [NSTimer scheduledTimerWithTimeInterval:kSpringLoadTimeInterval
                                                                        target:self selector:@selector(springLoadTimer:)
                                                                      userInfo:[NSNumber numberWithBool:goToPreviousPage] repeats:NO];
                }
            } else {
                [_springLoadTimer invalidate];
                _springLoadTimer = nil;
            }

            aFrame = self.frame;
            deltaX = loc.x - self.prevLoc.x;
            deltaY = loc.y - self.prevLoc.y;
            aFrame.origin.x += deltaX;
            aFrame.origin.y += deltaY;

            /*
            if (aFrame.origin.x + aFrame.size.width > [self superview].frame.size.width ||
                aFrame.origin.x < 0.0) {
                aFrame.origin.x -= deltaX;
            }
             */
            if (aFrame.origin.y + aFrame.size.height > [self superview].frame.size.height ||
                aFrame.origin.y < 0.0) {
                aFrame.origin.y -= deltaY;
            }

            [self setFrame:aFrame];
            self.prevLoc = loc;
            break;
        case UIGestureRecognizerStateEnded:
            self.prevLoc = CGPointZero;
            self.alpha = 1.0;
            [self.webView stringByEvaluatingJavaScriptFromString:@"widget.ondragend();"];
            break;
    }
}

- (void)handleSwipe:(UIGestureRecognizer *)sender {
    // When a swipe is detected, flip widget to its back if and only if it's currently displaying the front
    // The following javascript tries to do that based on a few assumptions
    // 1. Look through all 'img' elements and find one with alt attribute equals to 'Info'
    // 2. The parent node of that element is the div for info button
    // 3. If the info button exists and widget is currently displaying the side with the info button, emulate a mouse click on it
    // We guess which side the widget is currently displaying by traversing the DOM tree upwards from the info button.
    // If there is any element that has css display set to none, then the info button is not visible.
    // Since there is no way to determine the event handlers associated with a particular event for a particular element, we emulate a mosue click instead.

    // Some of the cases that this might fail to perform properly:
    // * Widget does not use the standard apple info button
    // * There are more than one info button
    // * There are more than one img with alt of 'Info'
    // * Front of the widget is not hidden by setting display to 'none'

    [self.webView stringByEvaluatingJavaScriptFromString:@"var images = document.getElementsByTagName('img'); var res;"
     "var infoVisible = function (info) {"
     "  while (info != document) {"
     "      if (window.getComputedStyle(info, null).display == 'none') {"
     "          return false;"
     "      }"
     "  info = info.parentNode;"
     "  }"
     "  return true;"
     "};"
     "var mouseClick = function (info) {"
     "  var evObj = document.createEvent('MouseEvents');"
     "  evObj.initMouseEvent( 'click', true, true, window, 1, 12, 345, 7, 220, false, false, true, false, 0, null );"
     "  info.dispatchEvent(evObj);"
     "};"
     "for (i = 0; i < images.length; i++) {if (images[i].alt == 'Info'){res = images[i].parentNode;break;}}"
     "if (res && infoVisible(res)) mouseClick(res);"];
}

- (void)closeWidget {
    [self.webView stringByEvaluatingJavaScriptFromString:@"widget.onremove();"];
    
    [UIView beginAnimations:@"suck" context:NULL];
    [UIView setAnimationDuration:0.6];
    [UIView setAnimationDelegate:self];
    [UIView setAnimationPosition:[self convertPoint:CGPointMake(self.closeX, self.closeY) toView:[self superview]]];
    [UIView setAnimationTransition:103 forView:self cache:NO];
    [UIView setAnimationDidStopSelector:@selector(removeFromSuperview)];
    [self.webView removeFromSuperview];
    [self.closeButton removeFromSuperview];
    [self.imageView removeFromSuperview];
    [UIView commitAnimations];
}

# pragma mark -
# pragma mark NSCoding Protocol
- (void)encodeWithCoder:(NSCoder *)encoder {
    [super encodeWithCoder:encoder];
    [encoder encodeObject:self.webView forKey:@"webView"];
    [encoder encodeObject:self.path forKey:@"path"];
    [encoder encodeObject:self.js_identifier forKey:@"js_identifier"];
    [encoder encodeInteger:self.closeX forKey:@"closeX"];
    [encoder encodeInteger:self.closeY forKey:@"closeY"];
    [encoder encodeFloat:self.prevLoc.x forKey:@"prevLoc.x"];
    [encoder encodeFloat:self.prevLoc.y forKey:@"prevLoc.y"];
    [encoder encodeObject:self.bundleIdentifier forKey:@"bundleIdentifier"];
    [encoder encodeInteger:self.positionX forKey:@"positionX"];
    [encoder encodeInteger:self.positionY forKey:@"positionY"];
}

- (id)initWithCoder:(NSCoder *)decoder {
    if (self = [super initWithCoder:decoder]) {
        self.path = [decoder decodeObjectForKey:@"path"];
        self.js_identifier = [decoder decodeObjectForKey:@"js_identifier"];
        self.bundleIdentifier = [decoder decodeObjectForKey:@"bundleIdentifier"];
        self.positionX = [decoder decodeIntegerForKey:@"positionX"];
        self.positionY = [decoder decodeIntegerForKey:@"positionY"];
        
        self.closeX = [decoder decodeIntegerForKey:@"closeX"];
        self.closeY = [decoder decodeIntegerForKey:@"closeY"];
        self.prevLoc = CGPointMake([decoder decodeFloatForKey:@"prevLoc.x"], [decoder decodeFloatForKey:@"prevLoc.y"]);

        self.webView = [decoder decodeObjectForKey:@"webView"];

        [self initialize];
        self.closeButton.hidden = YES;
    }
    return self;
}

# pragma mark -
# pragma mark UIWebViewDelegate

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    return YES;
}

- (void)webViewDidFinishLoad:(UIWebView *)aView {
    [self.imageView removeFromSuperview];
    self.imageView = nil;
    
    // Disable Copy/Cut/Paste menu
    [aView stringByEvaluatingJavaScriptFromString:@"document.documentElement.style.webkitUserSelect = \"none\";"];

    // Set window.resizeTo = widget.resizeTo
    [aView stringByEvaluatingJavaScriptFromString:@"window.resizeTo = function (width, height) {widget.resizeTo(width, height);};"];

    // Calculator
    // Taken from http://kludgets.googlecode.com/svn-history/r88/trunk/resources/scripts/macoswidgets.js
    [aView stringByEvaluatingJavaScriptFromString:@"widget.calculator = new Object;"
    "widget.calculator.evaluateExpression = function(exp, param) {"
    "if (exp == \"decimal_string\" || exp == \"thousands_separator\")"
    "{"
    "gDecimalSeparator = \".\";"
    "gDecimalCode = gDecimalSeparator.charCodeAt(0);"
    "gDecimalString = \"decimal\";"
    "gThousandsSeparator = \",\";"
    "}"
    "return eval(exp);"
    "};"];

    // Call widget.onshow
    [self.webView stringByEvaluatingJavaScriptFromString:@"widget.onshow();"];
}

# pragma mark -
# pragma mark JavsScript Methods

- (void)js_openURL:(NSString *)url {
    NSURL *aURL = [NSURL URLWithString:url];
    if ([[aURL scheme] isEqualToString:@"http"]) {
        [self performSelectorOnMainThread:@selector(openURLOnMainThread:) withObject:aURL waitUntilDone:NO];
    }
}

- (void)openURLOnMainThread:(NSURL*)url {
    [[NSNotificationCenter defaultCenter] postNotification:[NSNotification notificationWithName:@"widgetOpenURL" object:url]];
}

- (NSString *)js_preferenceForKey:(NSString *)key {
    NSLog(@"preferenceForKey(%@)", key);
    return [[NSUserDefaults standardUserDefaults] objectForKey:[NSString stringWithFormat:@"%@.%@", self.bundleIdentifier, key]];
}

- (void)js_setPreferenceForKey:(NSString *)preference forKey:(NSString*)key {
    NSLog(@"setPreferenceForKey(%@, %@)", preference, key);
    if (preference == nil) {
        [[NSUserDefaults standardUserDefaults] removeObjectForKey:[NSString stringWithFormat:@"%@.%@", self.bundleIdentifier, key]];
    } else {
        [[NSUserDefaults standardUserDefaults] setObject:preference forKey:[NSString stringWithFormat:@"%@.%@", self.bundleIdentifier, key]];
    }
}

- (void)js_setCloseBoxOffset:(NSNumber *)x y:(NSNumber *)y {
    NSLog(@"setCloseBoxOffset(%@, %@)", x, y);
    
    self.closeX = [x intValue];
    self.closeY = [y intValue];
    self.closeButton.frame = CGRectMake(self.closeX - 15, self.closeY - 15, 30, 30);
}

- (void)js_resizeAndMoveTo:(NSNumber *)x y:(NSNumber *)y width:(NSNumber *)width height:(NSNumber *)height {
    NSLog(@"resizeAndMoveTo(%@, %@, %@, %@)", x, y, width, height);
    
    [self performSelectorOnMainThread:@selector(resizeAndMoveToOnMainThread:) withObject:[NSArray arrayWithObjects:x, y, width, height, nil] waitUntilDone:NO];
}

- (NSNumber *)js_usesMetricUnits {
    return [[NSLocale currentLocale] objectForKey:NSLocaleUsesMetricSystem];
}

- (void)js_setPositionOffset:(NSNumber *)x y:(NSNumber *)y {
    NSLog(@"setPositionOffset(%@, %@)", x, y);
    self.positionX = [x intValue];
    self.positionY = [y intValue];

    [self performSelectorOnMainThread:@selector(resizeAndMoveToOnMainThread:) withObject:[NSArray arrayWithObjects:[NSNumber numberWithFloat:self.frame.origin.x], [NSNumber numberWithFloat:self.frame.origin.y], [NSNumber numberWithFloat:self.frame.size.width], [NSNumber numberWithFloat:self.frame.size.height], nil] waitUntilDone:NO];
}

- (void)js_resizeTo:(NSNumber *)width height:(NSNumber *)height {
    NSLog(@"resizeTo(%@, %@)", width, height);

    [self performSelectorOnMainThread:@selector(resizeAndMoveToOnMainThread:) withObject:[NSArray arrayWithObjects:[NSNumber numberWithFloat:self.frame.origin.x], [NSNumber numberWithFloat:self.frame.origin.y], width, height, nil] waitUntilDone:NO];    
}

// Same as resizeAndMoveTo but on main thread
- (void)resizeAndMoveToOnMainThread:(NSArray *)args {
    assert([NSThread isMainThread]);

    self.frame = CGRectMake([[args objectAtIndex:0] floatValue], [[args objectAtIndex:1] floatValue], [[args objectAtIndex:2] floatValue], [[args objectAtIndex:3] floatValue]);
    [self.webView stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"window.screenX = %f;", self.frame.origin.x + self.positionX]];
    [self.webView stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"window.screenY = %f;", self.frame.origin.y + self.positionY]];

    self.webView.frame = CGRectMake(0.0, 0.0, [[args objectAtIndex:2] floatValue], [[args objectAtIndex:3] floatValue]);
}

- (void)js_prepareForTransition:(NSString *)transition {
    NSLog(@"%s(%@)", _cmd, transition);

    // FIXME: buggy
    if ([transition isEqualToString:@"ToBack"]) {
        [UIView beginAnimations:@"ToBack" context:NULL];
        [UIView setAnimationDuration:0.6];
        [UIView setAnimationTransition:UIViewAnimationTransitionFlipFromRight forView:self cache:YES];
        [UIView setAnimationCurve:UIViewAnimationCurveLinear];
    }else if ([transition isEqualToString:@"ToFront"]) {
        [UIView beginAnimations:@"ToFront" context:NULL];
        [UIView setAnimationDuration:0.6];
        [UIView setAnimationTransition:UIViewAnimationTransitionFlipFromLeft forView:self cache:YES];
        [UIView setAnimationCurve:UIViewAnimationCurveLinear];
    }
}

- (void)js_performTransition {
    NSLog(@"%s", _cmd);

    // FIXME: buggy
    [UIView commitAnimations];
    [self.webView performSelectorOnMainThread:@selector(stringByEvaluatingJavaScriptFromString:) withObject:@"widget.ontransitioncomplete();" waitUntilDone:NO];
}

# pragma -
# pragma WebScripting Protocol

NSString * const kJSSelectorPrefix = @"js_";

+ (BOOL)isKeyExcludedFromWebScript:(const char *)name {
    NSString *keyName = [[[NSString alloc] initWithUTF8String: name] autorelease];
    return !([keyName hasPrefix:kJSSelectorPrefix]);
}

+ (NSString *)webScriptNameForKey:(const char *)name {
    NSString *keyName = [[[NSString alloc] initWithUTF8String: name] autorelease];
    if ([keyName hasPrefix:kJSSelectorPrefix] && ([keyName length] > [kJSSelectorPrefix length])) {
        return [keyName substringFromIndex:[kJSSelectorPrefix length]];
    }
    return nil;
}

+ (BOOL)isSelectorExcludedFromWebScript:(SEL)aSelector {
    return !([NSStringFromSelector(aSelector) hasPrefix:kJSSelectorPrefix]);
}

+ (NSString *)webScriptNameForSelector:(SEL)aSelector {
    NSString *selectorName = NSStringFromSelector(aSelector);
    if ([selectorName hasPrefix:kJSSelectorPrefix] && ([selectorName length] > [kJSSelectorPrefix length])) {
        return [[[selectorName substringFromIndex:[kJSSelectorPrefix length]] componentsSeparatedByString: @":"] objectAtIndex: 0];
    }
    return nil;
}

- (id)invokeUndefinedMethodFromWebScript:(NSString *)aName withArguments:(NSArray *)arguments {
    NSLog(@"%s %@ %@", _cmd, aName, arguments);
    /* TODO:
            widget.openApplication
            widget.system
            widget.closestCity
            widget.createMenu
     */
    return nil;
}

@end
