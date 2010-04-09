//
//  UIImage-NSCoding.h

#import <Foundation/Foundation.h>

@interface UIImageNSCoding <NSCoding>
- (id)initWithCoder:(NSCoder *)decoder;
- (void)encodeWithCoder:(NSCoder *)encoder;
@end
