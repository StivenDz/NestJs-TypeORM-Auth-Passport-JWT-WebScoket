import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Server, Socket } from 'socket.io';
import { NewMessageDto } from './dtos/new-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces';

@WebSocketGateway({cors:true})
export class MessagesWsGateway implements  OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() wss:Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService:JwtService
  ) {}

  async handleConnection(client: Socket) {
    // console.log(client);
    const token = client.handshake.headers.authentication as string;
    let payload:JwtPayload;
    try{
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client,payload.id);
    }catch(err){
      client.disconnect();
      return;
    }
    // console.log({token});
    
    // client.join("sales")
    
    // this.wss.to("sales").emit("")
    
    this.wss.emit("clients-updated", this.messagesWsService.getConnectedClients())
  }
  handleDisconnect(client: Socket) {
    this.messagesWsService.removeClient(client.id);
    this.wss.emit("clients-updated", this.messagesWsService.getConnectedClients())
  }
  
  @SubscribeMessage("message-from-client")
  handleMessageFromClient( client:Socket, payload:NewMessageDto ){
    console.log({payload},client.id);
    
    // emit to emitter client
    // client.emit("message-from-server",{
    //   fullName:"it's me!",
    //   message:payload.message || "no-message"
    // })

    // emit to other clients except emitter
    // client.broadcast.emit("message-from-server",{
    //   fullName:"it's me!",
    //   message:payload.message || "no-message"
    // })

    // this.wss.to("clientID")

    // emith to all clients incluiding emitter
    this.wss.emit("message-from-server",{
      fullName:this.messagesWsService.getUserFullNameBySocketId(client.id),
      message:payload.message || "no-message"
    })
  }
}
