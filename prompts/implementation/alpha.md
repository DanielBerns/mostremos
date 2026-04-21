I propose a different option: Suppose we use the following tree for deploying code in non uv servers

anywhere
    /frontend
    /backend
        /src
            /packages
                /api
                /core
                /infra
                
In this way, we dont need to change the code in api/app.py to find the frontend. What do you think?
