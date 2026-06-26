import json
import random
from datetime import datetime, timedelta

# Configuration
NUM_ALERTS = 459
RESOURCES = ["Water", "Food", "Medical", "Shelter", "Transport", "Rescue", "Clothing"]
NODE_IDS = [190180029, 190180030, 190180031, 190180032, 190180033]
START_DATE = datetime.now() - timedelta(days=30)
END_DATE = datetime.now()

alerts = []
alert_id = 1000

# Generate alerts over 30 days
current_time = START_DATE
time_increment = (END_DATE - START_DATE) / NUM_ALERTS

for i in range(NUM_ALERTS):
    # Randomize time slightly for more realistic distribution
    current_time += timedelta(seconds=random.randint(0, int(time_increment.total_seconds())))
    
    alert_id += 1
    node_id = random.choice(NODE_IDS)
    resource = random.choice(RESOURCES)
    severity = random.randint(25, 98)
    timestamp = int(current_time.timestamp())
    
    # 70% chance of being resolved
    status = "resolved" if random.random() < 0.7 else "active"
    
    alert = {
        "alertId": alert_id,
        "nodeId": node_id,
        "resource": resource,
        "severity": severity,
        "timestamp": timestamp,
        "status": status
    }
    
    # If resolved, add resolution details
    if status == "resolved":
        # Resolution time between 5 minutes to 2 hours
        resolution_delay = random.randint(300, 7200)
        alert["resolvedAt"] = timestamp + resolution_delay
        alert["resolvedBy"] = random.choice(NODE_IDS)
    
    alerts.append(alert)

# Sort by timestamp
alerts.sort(key=lambda x: x["timestamp"])

# Write to file
with open("mockAlerts.json", "w") as f:
    json.dump(alerts, f, indent=2)

print(f"Generated {len(alerts)} mock alerts")
print(f"Date range: {START_DATE.strftime('%Y-%m-%d')} to {END_DATE.strftime('%Y-%m-%d')}")
print(f"Active alerts: {sum(1 for a in alerts if a['status'] == 'active')}")
print(f"Resolved alerts: {sum(1 for a in alerts if a['status'] == 'resolved')}")
