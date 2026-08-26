resource "aws_db_instance" "cloudnotes_db" {

  identifier = "cloudnotes-db"

  engine         = "mysql"
  engine_version = "8.4.9"

  instance_class    = var.db_instance_type
  allocated_storage = var.storage_for_db
  storage_type      = var.db_storage_type

  db_name  = "cloudnotes_db"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.notes_db_subnet_group.name

  publicly_accessible = false
  multi_az            = false
  storage_encrypted   = true
  skip_final_snapshot = true

  tags = {
    Name = "cloudnotes_db"
  }
}

resource "aws_db_subnet_group" "notes_db_subnet_group" {
  name = "notes-db-subnet-group"

  subnet_ids = [
    aws_subnet.private[0].id,
    aws_subnet.private[1].id
  ]

  tags = {
    Name = "notes-db-subnet-group"
  }
}