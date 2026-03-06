// /* eslint-disable prettier/prettier */
// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { WsException } from '@nestjs/websockets';
// import { Socket } from 'socket.io';
// import { JwtService } from '@nestjs/jwt';
// @Injectable()
// export class WsJwtAuthGuard implements CanActivate {
//     constructor(private jwtService: JwtService) { }
//     async canActivate(context: ExecutionContext): Promise<boolean> {
//         try {
//             const client: Socket = context.switchToWs().getClient();
//             const token = this.extractTokenFromHeader(client);
//             if (!token) {
//                 throw new WsException('Unauthorized access');
//             }
//             const payload = await this.jwtService.verifyAsync(token);
//             // Attach user to socket
//             client['user'] = payload;
//             return true;
//         } catch {
//             throw new WsException('Unauthorized access');
//         }
//     }
//     private extractTokenFromHeader(client: Socket): string | undefined {
//         const auth = (client.handshake?.headers as any)?.authorization;
//         if (!auth) return undefined;
//         const [type, token] = auth.split(' ');
//         return type === 'Bearer' ? token : (undefined as string | undefined);
//     }
// }
//# sourceMappingURL=ws-jwt-auth.guard.js.map