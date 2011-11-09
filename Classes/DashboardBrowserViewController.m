//
//  DashboardBrowserViewController.m
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

#import "DashboardBrowserViewController.h"

@implementation DashboardBrowserViewController

@synthesize webView;
@synthesize home;

@synthesize toolbar, homeButton, backButton, forwardButton, spinner, actionButton;

- (id)initWithHome:(NSURL *)homeURL {
    if ((self = [super initWithNibName:@"DashboardBrowserViewController" bundle:nil])) {
        self.home = homeURL;
        actionSheet = nil;
    }
    return self;
}

// Implement viewDidLoad to do additional setup after loading the view, typically from a nib.
- (void)viewDidLoad {
    [super viewDidLoad];
    
    NSURLRequest *URLReq = [NSURLRequest requestWithURL:self.home];
    [self.webView loadRequest:URLReq];
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation {
    // Overriden to allow any orientation.
    return YES;
}


- (void)didReceiveMemoryWarning {
    // Releases the view if it doesn't have a superview.
    [super didReceiveMemoryWarning];
    
    // Release any cached data, images, etc that aren't in use.
}


- (void)viewDidUnload {
    [super viewDidUnload];
    // Release any retained subviews of the main view.
    // e.g. self.myOutlet = nil;
}


- (void)dealloc {
    self.home = nil;
    [super dealloc];
}

#pragma mark -
#pragma mark IBAction

- (IBAction)cancel {
    if (actionSheet) {
        [actionSheet dismissWithClickedButtonIndex:-1 animated:YES];
        actionSheet = nil;
    }
    [self.webView stopLoading];
    if ([self respondsToSelector:@selector(presentingViewController)]) {
        [[self presentingViewController] dismissModalViewControllerAnimated:YES];
    } else {
        [[self parentViewController] dismissModalViewControllerAnimated:YES];
    }
}

- (IBAction)goHome {
    NSURLRequest *URLReq = [NSURLRequest requestWithURL:self.home];
    [self.webView loadRequest:URLReq];
}

- (IBAction)action {
    if (actionSheet == nil) {
        UIActionSheet *aActionSheet = [[UIActionSheet alloc] initWithTitle:nil delegate:self cancelButtonTitle:nil destructiveButtonTitle:nil otherButtonTitles:@"Open in Safari", nil];
        [aActionSheet showFromBarButtonItem:self.actionButton animated:YES];
        [aActionSheet release];
    }
}

#pragma mark -
#pragma mark UIActionSheetDelegate

- (void)didPresentActionSheet:(UIActionSheet *)aActionSheet {
    actionSheet = aActionSheet;
}

- (void)actionSheet:(UIActionSheet *)aActionSheet didDismissWithButtonIndex:(NSInteger)buttonIndex {
    actionSheet = nil;
}

- (void)actionSheet:(UIActionSheet *)aActionSheet clickedButtonAtIndex:(NSInteger)buttonIndex {
    if (buttonIndex == 0) {
        // Open in Safari
        [[UIApplication sharedApplication] openURL:[self.webView.request URL]];
    }
}

#pragma mark -
#pragma mark UIWebViewDelegate

- (BOOL)webView:(UIWebView *)aWebView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    // TODO: move this code out of thise class so DashboardBrowserViewController can be reused.
    BOOL allowOpenSocial = [[[NSUserDefaults standardUserDefaults] stringForKey:@"preference_opensocial_server"] length] > 0;
    if ([[[request URL] path] hasSuffix:@".zip"] || [[[request URL] path] hasSuffix:@".widget"] ||
        (allowOpenSocial && [[[request URL] path] hasSuffix:@".xml"])) {
        if ([self respondsToSelector:@selector(presentingViewController)]) {
            if ([[self presentingViewController] isKindOfClass:[DashboardViewController class]]) {
                DashboardViewController *viewController = (DashboardViewController*)[self presentingViewController];
                [viewController.widgetsView addItem:request];
            }
        } else {
            if ([[self parentViewController] isKindOfClass:[DashboardViewController class]]) {
                DashboardViewController *viewController = (DashboardViewController*)[self parentViewController];
                [viewController.widgetsView addItem:request];
            }
        }
        
        if ([self respondsToSelector:@selector(presentingViewController)]) {
            [[self presentingViewController] dismissModalViewControllerAnimated:YES];
        } else {
            [[self parentViewController] dismissModalViewControllerAnimated:YES];
        }
        
        return NO;
    }

    return YES;
}

// TODO: actually handle errors instead of mimicking webViewDidFinishLoad
- (void)webView:(UIWebView *)aWebView didFailLoadWithError:(NSError *)error {
    self.backButton.enabled = aWebView.canGoBack;
    self.forwardButton.enabled = aWebView.canGoForward;
    [self.spinner stopAnimating];
    
    NSMutableArray *items = [NSMutableArray arrayWithArray:self.toolbar.items];
    UIBarButtonItem *reloadButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemRefresh target:aWebView action:@selector(reload)];
    [items replaceObjectAtIndex:3 withObject:reloadButton];
    [self.toolbar setItems:items];
    [reloadButton release];
}

- (void)webViewDidFinishLoad:(UIWebView *)aWebView {
    self.backButton.enabled = aWebView.canGoBack;
    self.forwardButton.enabled = aWebView.canGoForward;
    if ([[aWebView.request URL] isEqual: self.home]) {
        self.homeButton.enabled = NO;
    }else{
        self.homeButton.enabled = YES;
    }
    [self.spinner stopAnimating];
    
    NSMutableArray *items = [NSMutableArray arrayWithArray:self.toolbar.items];
    UIBarButtonItem *reloadButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemRefresh target:aWebView action:@selector(reload)];
    [items replaceObjectAtIndex:3 withObject:reloadButton];
    [self.toolbar setItems:items];
    [reloadButton release];
}

- (void)webViewDidStartLoad:(UIWebView *)aWebView {
    [self.spinner startAnimating];

    NSMutableArray *items = [NSMutableArray arrayWithArray:self.toolbar.items];
    UIBarButtonItem *stopButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemStop target:aWebView action:@selector(stopLoading)];
    [items replaceObjectAtIndex:3 withObject:stopButton];
    [self.toolbar setItems:items];
    [stopButton release];
}

@end
