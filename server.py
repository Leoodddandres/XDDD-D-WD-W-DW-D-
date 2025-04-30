from fastapi import FastAPI, WebSocket, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
import json
import os
import zipfile
import subprocess
import shutil
from typing import Dict, Optional
from datetime import datetime

app = FastAPI()
active_connections: Dict[str, WebSocket] = {}
active_bots: Dict[str, subprocess.Popen] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        auth = await websocket.receive_json()
        user_id = auth.get('token')
        if not user_id:
            await websocket.close(code=4001)
            return
            
        active_connections[user_id] = websocket
        
        try:
            while True:
                data = await websocket.receive_json()
                
                if data.get('action') == 'start_bot':
                    bot_id = data.get('bot_id')
                    await start_bot(bot_id, user_id)
                elif data.get('action') == 'stop_bot':
                    bot_id = data.get('bot_id')
                    await stop_bot(bot_id, user_id)
                    
        except Exception as e:
            print(f"Error in websocket connection: {e}")
            
    finally:
        if user_id in active_connections:
            del active_connections[user_id]

@app.post("/upload-bot")
async def upload_bot(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    bot_file: UploadFile = File(...),
    user_id: str = Form(...)
):
    try:
        # Create user directory if it doesn't exist
        user_dir = f"bots/{user_id}"
        bot_dir = f"{user_dir}/{name}"
        os.makedirs(bot_dir, exist_ok=True)
        
        # Save the uploaded file
        file_path = f"{bot_dir}/bot.zip"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(bot_file.file, buffer)
        
        # Extract the ZIP file
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(bot_dir)
        
        # Remove the ZIP file
        os.remove(file_path)
        
        # Install dependencies
        package_json = f"{bot_dir}/package.json"
        if os.path.exists(package_json):
            process = await asyncio.create_subprocess_exec(
                'npm',
                'install',
                cwd=bot_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"Error installing dependencies: {stderr.decode()}")
            
            if user_id in active_connections:
                await active_connections[user_id].send_json({
                    "type": "console_output",
                    "message": f"Dependencies installed for {name}"
                })
        
        return JSONResponse({
            "status": "success",
            "message": "Bot uploaded successfully",
            "bot_id": name
        })
        
    except Exception as e:
        return JSONResponse({
            "status": "error",
            "message": str(e)
        }, status_code=500)

async def start_bot(bot_id: str, user_id: str):
    try:
        bot_dir = f"bots/{user_id}/{bot_id}"
        if not os.path.exists(bot_dir):
            raise Exception("Bot not found")
        
        # Start the bot process
        process = await asyncio.create_subprocess_exec(
            'npm',
            'start',
            cwd=bot_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        active_bots[bot_id] = process
        
        # Monitor the process output
        asyncio.create_task(monitor_bot_output(process, bot_id, user_id))
        
        if user_id in active_connections:
            await active_connections[user_id].send_json({
                "type": "console_output",
                "message": f"Bot {bot_id} started"
            })
            
    except Exception as e:
        if user_id in active_connections:
            await active_connections[user_id].send_json({
                "type": "console_output",
                "message": f"Error starting bot: {str(e)}",
                "error": True
            })

async def stop_bot(bot_id: str, user_id: str):
    if bot_id in active_bots:
        process = active_bots[bot_id]
        process.terminate()
        await process.wait()
        del active_bots[bot_id]
        
        if user_id in active_connections:
            await active_connections[user_id].send_json({
                "type": "console_output",
                "message": f"Bot {bot_id} stopped"
            })

async def monitor_bot_output(process: asyncio.subprocess.Process, bot_id: str, user_id: str):
    try:
        while True:
            line = await process.stdout.readline()
            if not line:
                break
                
            line = line.decode().strip()
            
            # Check for QR code in output
            if "qr-code:" in line.lower():
                qr_data = line.split("qr-code:")[1].strip()
                if user_id in active_connections:
                    await active_connections[user_id].send_json({
                        "type": "qr_code",
                        "qr": qr_data
                    })
            else:
                if user_id in active_connections:
                    await active_connections[user_id].send_json({
                        "type": "console_output",
                        "message": line
                    })
                    
    except Exception as e:
        print(f"Error monitoring bot output: {e}")
    finally:
        if bot_id in active_bots:
            del active_bots[bot_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)