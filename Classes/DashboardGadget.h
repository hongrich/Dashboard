//
//  DashboardGadget.h
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

#import <Foundation/Foundation.h>
#import "DashboardAppDelegate.h"


@interface DashboardGadget : NSObject {
    NSString *title;
    NSString *url;
    NSInteger height;
    NSInteger width;
    NSString *prefHtml;
    BOOL parsingEnum;
}

@property (nonatomic, retain) NSString *title;
@property (nonatomic, retain) NSString *url;
@property (nonatomic) NSInteger height;
@property (nonatomic) NSInteger width;
@property (nonatomic, retain) NSString *prefHtml;
@property (nonatomic) BOOL parsingEnum;

- (DashboardGadget*) initWithUrl:(NSString*) aUrl;
- (NSString*) createWidget;

#define GADGET_PADDING 20

@end
