package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		locationsCollection, err := app.FindCollectionByNameOrId("locations")
		if err != nil {
			return err
		}

		collection := core.NewBaseCollection("equipment")

		collection.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.SelectField{
				Name:     "equipment_type",
				Required: true,
				Values:   []string{"服务器", "3D打印机", "测试设备", "加工设备", "其他"},
			},
			&core.RelationField{
				Name:         "location",
				Required:     false,
				CollectionId: locationsCollection.Id,
				MaxSelect:    types.Pointer(1),
			},
			&core.SelectField{
				Name:     "status",
				Required: true,
				Values:   []string{"可用", "维护中", "停用"},
			},
			&core.NumberField{Name: "default_duration", Required: false},
			&core.TextField{Name: "note", Required: false},
			&core.BoolField{Name: "is_active", Required: true},
		)

		collection.ListRule = types.Pointer("is_active = true")
		collection.ViewRule = types.Pointer("is_active = true")
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		if err := app.Save(collection); err != nil {
			return err
		}

		equipmentInit := []struct {
			name          string
			equipmentType string
		}{
			{"服务器 A", "服务器"},
			{"服务器 B", "服务器"},
			{"3D 打印机", "3D打印机"},
		}

		for _, e := range equipmentInit {
			record := core.NewRecord(collection)
			record.Set("name", e.name)
			record.Set("equipment_type", e.equipmentType)
			record.Set("status", "可用")
			record.Set("is_active", true)
			if err := app.Save(record); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("equipment")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
