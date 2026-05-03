import sys, json
issues = json.loads(sys.stdin.read())
for i in issues:
    if i['status'] not in ('done','cancelled'):
        print(f'{i["identifier"]} {i["status"]:>12} {i["priority"]:>6} {i["title"][:80]}')
